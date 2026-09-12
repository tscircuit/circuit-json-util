import { expect, test } from "bun:test"
import type { PcbSmtPad, PcbTrace } from "circuit-json"
import { computeClearanceBetweenElements } from "../lib/compute-clearance-between-elements"
import { computeGapBetweenCopper } from "../lib/compute-gap-between-copper"

const trace: PcbTrace = {
  type: "pcb_trace",
  pcb_trace_id: "trace_with_via",
  route: [
    { route_type: "wire", x: 0, y: 0, width: 1, layer: "top" },
    { route_type: "via", x: 10, y: 0, from_layer: "top", to_layer: "bottom" },
    { route_type: "wire", x: 20, y: 0, width: 2, layer: "bottom" },
  ],
}

const circleAt = (x: number, y: number): PcbSmtPad => ({
  type: "pcb_smtpad",
  pcb_smtpad_id: "nearby_pad",
  shape: "circle",
  x,
  y,
  radius: 0.5,
  layer: "top",
})

for (const [name, distance] of [
  ["copper gap", computeGapBetweenCopper],
  ["clearance", computeClearanceBetweenElements],
] as const) {
  test(`${name}: includes wire-to-via copper using the incoming wire width`, () => {
    expect(distance(trace, circleAt(5, 2))).toBeCloseTo(1)
    expect(distance(circleAt(5, 2), trace)).toBeCloseTo(1)
  })

  test(`${name}: includes via-to-wire copper using the outgoing wire width`, () => {
    expect(distance(trace, circleAt(15, 2))).toBeCloseTo(0.5)
    expect(distance(circleAt(15, 2), trace)).toBeCloseTo(0.5)
  })

  test(`${name}: detects overlap on both sides of a via`, () => {
    expect(distance(trace, circleAt(5, 0))).toBe(0)
    expect(distance(trace, circleAt(15, 0))).toBe(0)
  })

  test(`${name}: retains rounded copper at a via-adjacent segment endpoint`, () => {
    const wireToVia: PcbTrace = { ...trace, route: trace.route.slice(0, 2) }
    expect(distance(wireToVia, circleAt(11.5, 0))).toBeCloseTo(0.5)
  })

  test(`${name}: does not invent a width for a via-to-via pair`, () => {
    const viaOnly: PcbTrace = {
      ...trace,
      route: [
        {
          route_type: "via",
          x: 0,
          y: 0,
          from_layer: "top",
          to_layer: "bottom",
        },
        {
          route_type: "via",
          x: 10,
          y: 0,
          from_layer: "bottom",
          to_layer: "top",
        },
      ],
    }
    expect(distance(viaOnly, circleAt(5, 0))).toBe(Number.POSITIVE_INFINITY)
  })
}
