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
    port_hints: ["pin1", "anode"],
  },
  {
    type: "source_port",
    source_port_id: "p2",
    source_component_id: "r2",
    name: "left",
    port_hints: ["pin1"],
  },
  {
    type: "source_port",
    source_port_id: "p3",
    source_component_id: "r1",
    name: "right",
    port_hints: ["pin2"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_p1",
    source_port_id: "p1",
    pcb_component_id: "pcb_r1",
    x: -1,
    y: 0,
    layers: ["top"],
  },
]

test("compound parents select only their own matching children", () => {
  expect(applySelector(circuit, "source_component.R1 > port.left")).toEqual([
    circuit[2]!,
  ])
  expect(applySelector(circuit, "source_component.R2 > port.left")).toEqual([
    circuit[3]!,
  ])
})

test("compound parents preserve the existing space combinator behavior", () => {
  expect(applySelector(circuit, "source_component.R1 port.right")).toEqual([
    circuit[4]!,
  ])
})

test("compound parents can match multiple port hints", () => {
  expect(applySelector(circuit, "port.left.anode > pcb_port")).toEqual([
    circuit[5]!,
  ])
  expect(applySelector(circuit, ".left.anode > pcb_port")).toEqual([
    circuit[5]!,
  ])
})

test("nonmatching compound parents return no children", () => {
  expect(
    applySelector(circuit, "source_component.missing > port.left"),
  ).toEqual([])
  expect(applySelector(circuit, "source_port.R1 > port.left")).toEqual([])
})

test("compound parent selection preserves input and element identity", () => {
  const before = structuredClone(circuit)
  const selected = applySelector(circuit, "source_component.R1 > source_port")
  expect(selected).toEqual([circuit[2]!, circuit[4]!])
  expect(selected[0]).toBe(circuit[2]!)
  expect(selected[1]).toBe(circuit[4]!)
  expect(circuit).toEqual(before)
})

test("simple parents and standalone compound selectors remain unchanged", () => {
  expect(applySelector(circuit, ".R1 > port.left")).toEqual([circuit[2]!])
  expect(applySelector(circuit, "source_component > port.left")).toEqual([
    circuit[2]!,
    circuit[3]!,
  ])
  expect(applySelector(circuit, "source_component.R1")).toEqual([circuit[0]!])
})

test("unsupported sibling combinators remain rejected", () => {
  expect(() =>
    applySelector(circuit, "source_component.R1 + port.left"),
  ).toThrow('complex combinator "+"')
})
