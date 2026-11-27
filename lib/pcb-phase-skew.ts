import type {
  AnyCircuitElement,
  LayerRef,
  PcbDifferentialPairPhaseSkew,
  PcbDifferentialPairPhaseSkewTrace,
  PcbTrace,
  Point,
} from "circuit-json"
import { clamp } from "./shape-distances/geometry"

type TraceId = PcbTrace["pcb_trace_id"]
type MeasuredTrace = {
  trace: PcbDifferentialPairPhaseSkewTrace
  maxLengthSkew?: number
}
export type PcbPhaseSkewIndex = ReadonlyMap<TraceId, MeasuredTrace>

/** Resolve measurements against the copper in this scene, in any element order. */
export function createPcbPhaseSkewIndex(
  elements: readonly AnyCircuitElement[],
): PcbPhaseSkewIndex {
  const traceIds = new Set<TraceId>()
  const limits = new Map<string, number | undefined>()
  const pairs: PcbDifferentialPairPhaseSkew[] = []
  for (const element of elements) {
    if (element.type === "pcb_trace") traceIds.add(element.pcb_trace_id)
    if (element.type === "source_bus")
      limits.set(element.source_bus_id, element.max_length_skew)
    if (element.type === "pcb_differential_pair_phase_skew") pairs.push(element)
  }

  const index = new Map<TraceId, MeasuredTrace>()
  for (const pair of pairs) {
    const { positive_trace, negative_trace } = pair
    // Older Circuit JSON can lack the per-leg measurements. Edits can also
    // remove a trace while leaving its analysis record in the scene.
    if (
      !Array.isArray(positive_trace?.segments) ||
      !Array.isArray(negative_trace?.segments) ||
      !traceIds.has(positive_trace.pcb_trace_id) ||
      !traceIds.has(negative_trace.pcb_trace_id)
    )
      continue
    const maxLengthSkew = limits.get(pair.source_bus_id)
    for (const trace of [positive_trace, negative_trace]) {
      index.set(trace.pcb_trace_id, { trace, maxLengthSkew })
    }
  }
  return index
}

type Segment = { start: Point; end: Point }

function project(point: Point, { start, end }: Segment) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const fraction =
    lengthSquared === 0
      ? 0
      : clamp(
          ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
          0,
          1,
        )
  const x = start.x + fraction * dx
  const y = start.y + fraction * dy
  return { x, y, fraction, distance: Math.hypot(point.x - x, point.y - y) }
}

/**
 * Sample the measured copper under a pick. Candidates are the caller's copper
 * hits on this layer. Supply the centerline for a wire picked with a mouse
 * tolerance, or just the trace ID for a point already inside a copper shape.
 */
export function getPcbPhaseSkewAtPoint({
  index,
  layer,
  point,
  candidates,
}: {
  index: PcbPhaseSkewIndex
  layer: LayerRef
  point: Point
  candidates: Iterable<{ pcbTraceId: TraceId; centerline?: Segment }>
}): { pcbTraceId: TraceId; differenceMm: number } | undefined {
  let nearestDistance = Infinity
  let pickedPoint = point
  let traceId: TraceId | undefined
  for (const { pcbTraceId, centerline } of candidates) {
    const projection = centerline && project(point, centerline)
    const distance = projection?.distance ?? 0
    if (distance >= nearestDistance) continue
    nearestDistance = distance
    pickedPoint = projection ?? point
    traceId = pcbTraceId
  }
  if (traceId === undefined) return
  const entry = index.get(traceId)
  if (!entry) return

  let nearestSegmentDistance = Infinity
  let hit: { pcbTraceId: TraceId; differenceMm: number } | undefined
  for (const segment of entry.trace.segments) {
    if (segment.layer !== layer || segment.width <= 0) continue
    if (segment.start.x === segment.end.x && segment.start.y === segment.end.y)
      continue
    const { fraction, distance } = project(pickedPoint, segment)
    if (!(distance <= segment.width / 2 && distance < nearestSegmentDistance))
      continue
    const differenceMm =
      segment.start_length_difference_mm +
      fraction *
        (segment.end_length_difference_mm - segment.start_length_difference_mm)
    if (!Number.isFinite(differenceMm)) continue
    nearestSegmentDistance = distance
    hit = { pcbTraceId: traceId, differenceMm }
  }
  return hit
}
