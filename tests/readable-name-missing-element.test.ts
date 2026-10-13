import { expect, test } from "bun:test"
import { type AnyCircuitElement, source_simple_resistor } from "circuit-json"
import { getReadableNameForElement } from "../index"

for (const id of [
  "pcb_smtpad_missing",
  "pcb_port_missing",
  "pcb_trace_missing",
]) {
  test(`missing element ${id} produces its diagnostic fallback`, () => {
    expect(getReadableNameForElement([], id)).toBe(
      `unknown (could not find element with id ${id})`,
    )
  })
}
const component = source_simple_resistor.parse({
  type: "source_component",
  source_component_id: "source_component_0",
  name: "R1",
  ftype: "simple_resistor",
  resistance: 100,
})
const soup: AnyCircuitElement[] = [component]
test("an existing source component keeps its readable name", () => {
  expect(getReadableNameForElement(soup, "source_component_0")).toBe(
    "source_component[R1]",
  )
  expect(getReadableNameForElement(soup, component)).toBe(
    "source_component[R1]",
  )
})
test("a missing ID in a populated circuit does not mutate that circuit", () => {
  const before = structuredClone(soup)
  expect(getReadableNameForElement(soup, "pcb_smtpad_missing")).toBe(
    "unknown (could not find element with id pcb_smtpad_missing)",
  )
  expect(soup).toEqual(before)
})
