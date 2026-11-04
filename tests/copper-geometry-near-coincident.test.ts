import { expect, test } from "bun:test"
import { copperPolygonsTouch, getTraceSegmentPolygon } from "../index"

test.failing(
  "copperPolygonsTouch handles scaled traces with near-coincident endpoints",
  () => {
    // Match core's copper-pour cleanup: build in mm, then scale the polygons.
    // Scaling the coordinates before polygon construction does not reproduce it.
    const scale = 1e6
    const incomingTrace = getTraceSegmentPolygon(
      { x: 23.825, y: 10 },
      { x: 24.675, y: 10 },
      0.25,
    ).scale(scale, scale)
    const nearlyCoincidentTrace = getTraceSegmentPolygon(
      { x: 24.675, y: 10 },
      { x: 24.674999999999997, y: 10 },
      0.25,
    ).scale(scale, scale)

    // Both traces share an endpoint and must touch. Currently this throws
    // "Zero division" in Flatten's Vector.normalize during polygon containment.
    expect(
      copperPolygonsTouch(incomingTrace, nearlyCoincidentTrace, 1e-7 * scale),
    ).toBe(true)
  },
)
