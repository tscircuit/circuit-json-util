import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { applySelector } from "../lib/apply-selector"

const circuit: AnyCircuitElement[] = [
  {
    type: "source_component",
    source_component_id: "r1",
    name: "R1",
    ftype: "simple_resistor",
    resistance: 1000,
    supplier_part_numbers: {},
  },
  {
    type: "source_component",
    source_component_id: "r2",
    name: "R2",
    ftype: "simple_resistor",
    resistance: 2000,
    supplier_part_numbers: {},
  },
  {
    type: "source_port",
    source_port_id: "p1",
    source_component_id: "r1",
    name: "left",
  },
]

test("adding a matching class preserves functional-type matches", () => {
  expect(applySelector(circuit, "simple_resistor")).toEqual(circuit.slice(0, 2))
  expect(applySelector(circuit, "simple_resistor.R1")).toEqual([circuit[0]!])
})

test("functional-type compound selectors distinguish component names", () => {
  expect(applySelector(circuit, "simple_resistor.R2")).toEqual([circuit[1]!])
  expect(applySelector(circuit, "simple_resistor.left")).toEqual([])
})

test("element-type and abbreviated port compound selectors still match", () => {
  expect(applySelector(circuit, "source_component.R1")).toEqual([circuit[0]!])
  expect(applySelector(circuit, "port.left")).toEqual([circuit[2]!])
})
