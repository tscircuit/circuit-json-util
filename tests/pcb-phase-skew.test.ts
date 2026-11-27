import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  PcbDifferentialPairPhaseSkew,
  PcbTrace,
  SourceBus,
} from "circuit-json"
import { createPcbPhaseSkewIndex, getPcbPhaseSkewAtPoint } from "../index"

const wire = (pcb_trace_id: string, y: number): PcbTrace => ({
  type: "pcb_trace",
  pcb_trace_id,
  route: [0, 10].map((x) => ({
    route_type: "wire",
    x,
    y,
    width: 0.2,
    layer: "top",
  })),
})
const leg = (pcb_trace_id: string, y: number, skew: number) => ({
  pcb_trace_id,
  segments: [
    {
      start: { x: 0, y },
      end: { x: 5, y },
      layer: "top" as const,
      width: 0.2,
      start_length_difference_mm: 0,
      end_length_difference_mm: skew,
    },
  ],
})
const pair: PcbDifferentialPairPhaseSkew = {
  type: "pcb_differential_pair_phase_skew",
  pcb_differential_pair_phase_skew_id: "skew",
  source_bus_id: "pair",
  positive_trace: leg("p", 1, 2),
  negative_trace: leg("n", 0, -2),
}
const bus: SourceBus = {
  type: "source_bus",
  source_bus_id: "pair",
  name: "pair",
  source_trace_ids: ["source_p", "source_n"],
  max_length_skew: 0,
}
const positive = wire("p", 1)
const negative = wire("n", 0)
const index = createPcbPhaseSkewIndex([pair, negative, bus, positive])
const candidates = [pair.positive_trace, pair.negative_trace].map(
  ({ pcb_trace_id, segments }) => ({
    pcbTraceId: pcb_trace_id,
    centerline: {
      start: segments[0]!.start,
      end: { ...segments[0]!.end, x: 10 },
    },
  }),
)

test("only indexes complete pairs with both PCB traces and resolves a zero bus limit", () => {
  expect(index.size).toBe(2)
  expect(index.get("n")).toEqual({
    trace: pair.negative_trace,
    maxLengthSkew: 0,
  })
  expect(
    createPcbPhaseSkewIndex([pair, negative, positive]).get("p")?.maxLengthSkew,
  ).toBeUndefined()
  expect(createPcbPhaseSkewIndex([pair, positive]).size).toBe(0)
  expect(createPcbPhaseSkewIndex([pair, negative]).size).toBe(0)
  for (const partial of [
    { ...pair, positive_trace: undefined },
    { ...pair, negative_trace: { pcb_trace_id: "n" } },
  ]) {
    expect(
      createPcbPhaseSkewIndex([
        partial as AnyCircuitElement,
        positive,
        negative,
      ]).size,
    ).toBe(0)
  }
})

test("samples the nearest picked trace, interpolates either sign and preserves measured zero", () => {
  const at = (x: number, y: number) =>
    getPcbPhaseSkewAtPoint({ index, candidates, layer: "top", point: { x, y } })
  expect(at(2.5, 0.8)).toEqual({ pcbTraceId: "p", differenceMm: 1 })
  expect(at(2.5, 0.3)).toEqual({ pcbTraceId: "n", differenceMm: -1 })
  expect(at(0, 1)).toEqual({ pcbTraceId: "p", differenceMm: 0 })
  expect(at(8, 1)).toBeUndefined()
  expect(
    getPcbPhaseSkewAtPoint({
      index,
      candidates,
      layer: "bottom",
      point: { x: 2.5, y: 1 },
    }),
  ).toBeUndefined()
})

test("a closer ordinary trace takes precedence and area hits stay inside measured copper", () => {
  const point = { x: 2.5, y: 0.7 }
  expect(
    getPcbPhaseSkewAtPoint({
      index,
      candidates: [...candidates, { pcbTraceId: "ordinary" }],
      point,
      layer: "top",
    }),
  ).toBeUndefined()
  expect(
    getPcbPhaseSkewAtPoint({
      index,
      candidates: [{ pcbTraceId: "p" }],
      point,
      layer: "top",
    }),
  ).toBeUndefined()
  expect(
    getPcbPhaseSkewAtPoint({
      index,
      candidates: [{ pcbTraceId: "p" }],
      point: { x: 2.5, y: 1.05 },
      layer: "top",
    }),
  ).toEqual({ pcbTraceId: "p", differenceMm: 1 })
})
