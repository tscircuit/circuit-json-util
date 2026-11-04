import type { PcbCopperPourBRep } from "circuit-json"
import { EPSILON } from "./geometry"
import type { Point, Polygon } from "./types"

type BRepVertex =
  PcbCopperPourBRep["brep_shape"]["outer_ring"]["vertices"][number]

const MAX_ARC_STEP_RADIANS = Math.PI / 32

const arePointsEqual = (first: Point, second: Point) =>
  Math.abs(first.x - second.x) <= EPSILON &&
  Math.abs(first.y - second.y) <= EPSILON

const expandBRepRing = (vertices: BRepVertex[]): Point[] => {
  const ring: Point[] = []

  for (let index = 0; index < vertices.length; index++) {
    const start = vertices[index]
    const end = vertices[(index + 1) % vertices.length]
    if (!start || !end) continue

    const bulge = start.bulge ?? 0
    const chordLength = Math.hypot(end.x - start.x, end.y - start.y)
    if (Math.abs(bulge) <= EPSILON || chordLength <= EPSILON) {
      ring.push({ x: start.x, y: start.y })
      continue
    }

    const sweepRadians = 4 * Math.atan(bulge)
    const centerOffset = (chordLength * (1 - bulge * bulge)) / (4 * bulge)
    const center = {
      x:
        (start.x + end.x) / 2 -
        ((end.y - start.y) / chordLength) * centerOffset,
      y:
        (start.y + end.y) / 2 +
        ((end.x - start.x) / chordLength) * centerOffset,
    }
    const radius = (chordLength * (1 + bulge * bulge)) / (4 * Math.abs(bulge))
    const startAngle = Math.atan2(start.y - center.y, start.x - center.x)
    const segmentCount = Math.max(
      1,
      Math.ceil(Math.abs(sweepRadians) / MAX_ARC_STEP_RADIANS),
    )

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
      const angle = startAngle + (sweepRadians * segmentIndex) / segmentCount
      ring.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      })
    }
  }

  const deduplicated = ring.filter(
    (point, index) => index === 0 || !arePointsEqual(point, ring[index - 1]!),
  )
  if (
    deduplicated.length > 1 &&
    arePointsEqual(deduplicated[0]!, deduplicated.at(-1)!)
  ) {
    deduplicated.pop()
  }
  return deduplicated
}

export const getBRepCopperPourPolygon = (pour: PcbCopperPourBRep): Polygon => ({
  kind: "polygon",
  points: expandBRepRing(pour.brep_shape.outer_ring.vertices),
  holes: pour.brep_shape.inner_rings
    .map((ring) => expandBRepRing(ring.vertices))
    .filter((ring) => ring.length >= 3),
})
