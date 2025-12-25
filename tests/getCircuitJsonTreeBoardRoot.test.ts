import { test, expect } from "bun:test"
import { getCircuitJsonTree } from "../lib/getCircuitJsonTree"
import { runTscircuitCode } from "tscircuit"
import { getStringFromCircuitJsonTree } from "lib/getStringFromCircuitJsonTree"
import type { AnyCircuitElement } from "circuit-json"

test("getCircuitJsonTree - board only includes root source_group", async () => {
  const circuitJson = (await runTscircuitCode(`

  export default () => (
    <board autoroutingDisabled>
      <resistor name="R1" resistance="1k" />
      <capacitor name="C1" capacitance="100nF" />
    </board>
  )
  `)) as AnyCircuitElement[]

  const tree = getCircuitJsonTree(circuitJson)

  expect(getStringFromCircuitJsonTree(tree)).toMatchInlineSnapshot(`
    "source_group_0
      R1
      C1"
  `)
})
