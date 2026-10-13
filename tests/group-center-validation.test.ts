import { expect, test } from "bun:test"
import { type AnyCircuitElement, any_circuit_element } from "circuit-json"
import { getBoundsOfPcbElements, repositionPcbGroupTo } from "../index"
import { findBoundsAndCenter } from "../lib/find-bounds-and-center"

const fixture = (rotation: number): AnyCircuitElement[] =>
  [
    { type: "source_group", source_group_id: "g" },
    {
      type: "source_group",
      source_group_id: "child",
      parent_source_group_id: "g",
    },
    { type: "source_group", source_group_id: "other" },
    {
      type: "source_component",
      ftype: "simple_resistor",
      source_component_id: "sc1",
      source_group_id: "g",
      name: "R1",
      resistance: 1000,
    },
    {
      type: "source_component",
      ftype: "simple_resistor",
      source_component_id: "sc2",
      source_group_id: "child",
      name: "R2",
      resistance: 1000,
    },
    {
      type: "source_component",
      ftype: "simple_resistor",
      source_component_id: "sc3",
      source_group_id: "other",
      name: "R3",
      resistance: 1000,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc1",
      source_component_id: "sc1",
      center: { x: 0, y: 0 },
      width: 4,
      height: 1,
      rotation,
      layer: "top",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc2",
      source_component_id: "sc2",
      center: { x: 10, y: 0 },
      width: 2,
      height: 2,
      rotation: 0,
      layer: "top",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pc3",
      source_component_id: "sc3",
      center: { x: 30, y: 20 },
      width: 2,
      height: 2,
      rotation: 0,
      layer: "top",
    },
  ].map((element) => any_circuit_element.parse(element))
const moved = (circuit: AnyCircuitElement[]) =>
  circuit.filter(
    (element) =>
      element.type === "pcb_component" && element.pcb_component_id !== "pc3",
  )
for (const rotation of [0, 90, 45]) {
  test(`group target agrees with public PCB bounds at ${rotation} degrees`, () => {
    const circuit = fixture(rotation)
    const sibling = structuredClone(circuit.at(-1))
    repositionPcbGroupTo(circuit, "g", { x: 20, y: 15 })
    const bounds = getBoundsOfPcbElements(moved(circuit))
    expect((bounds.minX + bounds.maxX) / 2).toBeCloseTo(20, 8)
    expect((bounds.minY + bounds.maxY) / 2).toBeCloseTo(15, 8)
    expect(circuit.at(-1)).toEqual(sibling)
  })
  test(`group center calculation agrees with public PCB bounds at ${rotation} degrees`, () => {
    const circuit = fixture(rotation)
    const bounds = getBoundsOfPcbElements(moved(circuit))
    const center = findBoundsAndCenter(moved(circuit)).center
    expect(center.x).toBeCloseTo((bounds.minX + bounds.maxX) / 2, 8)
    expect(center.y).toBeCloseTo((bounds.minY + bounds.maxY) / 2, 8)
  })
}

test("quarter-turn placement matches independently calculated component centers", () => {
  const circuit = fixture(90)
  const before = structuredClone(circuit)
  // The rotated 4x1 component spans x [-0.5, 0.5]; its neighbor spans [9, 11].
  // Their bounding center is (5.25, 0), so the required translation is (14.75, 15).
  repositionPcbGroupTo(circuit, "g", { x: 20, y: 15 })
  const components = circuit.filter(
    (element) => element.type === "pcb_component",
  )
  expect(components.map((component) => component.center)).toEqual([
    { x: 14.75, y: 15 },
    { x: 24.75, y: 15 },
    { x: 30, y: 20 },
  ])
  for (let index = 0; index < circuit.length; index++) {
    const element = circuit[index]!
    const original = before[index]!
    if (element.type !== "pcb_component" && original.type !== "pcb_component") {
      expect(element).toEqual(original)
    } else if (
      element.type === "pcb_component" &&
      original.type === "pcb_component"
    ) {
      expect({ ...element, center: original.center }).toEqual(original)
    }
  }
})
