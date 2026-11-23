import { expect, expectTypeOf, test } from "bun:test"
import type { CircuitJson, PcbComponent } from "circuit-json"
import { Circuit } from "tscircuit"
import { cju } from "../index"

type Snapshot<T> = T extends object
  ? { readonly [Key in keyof T]: Snapshot<T[Key]> }
  : T

test("cju queries a frozen Circuit JSON snapshot", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={8} height={10} routingDisabled>
      <resistor name="R1" resistance="10k" footprint="0603" />
    </board>,
  )
  await circuit.renderUntilSettled()

  const snapshot: Snapshot<CircuitJson> = Object.freeze(
    circuit.getCircuitJson().map((element) => Object.freeze(element)),
  )
  const db = cju(snapshot)
  const components = db.pcb_component.list({ layer: "top" })
  const component = db.pcb_component.get(components[0]!.pcb_component_id)
  const missing = db.pcb_component.getWhere({ pcb_component_id: "missing" })
  const records = db.toArray()

  expectTypeOf(components).toEqualTypeOf<readonly Snapshot<PcbComponent>[]>()
  expectTypeOf(component).toEqualTypeOf<Snapshot<PcbComponent> | null>()
  expectTypeOf(missing).toEqualTypeOf<Snapshot<PcbComponent> | null>()
  expectTypeOf(records).toEqualTypeOf<Snapshot<CircuitJson>>()
  expectTypeOf(db).not.toHaveProperty("insert")
  expectTypeOf(db.pcb_component).not.toHaveProperty("update")

  expect(components).toHaveLength(1)
  expect(component).toBe(components[0]!)
  expect(db.pcb_component.get("missing")).toBeNull()
  expect(missing).toBeNull()
  expect(Object.is(records, snapshot)).toBe(true)
})
