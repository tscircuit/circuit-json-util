import { test, expect } from "bun:test"
import { getCircuitJsonTree } from "../lib/getCircuitJsonTree"
import { runTscircuitCode } from "tscircuit"
import { getStringFromCircuitJsonTree } from "lib/getStringFromCircuitJsonTree"

test("getCircuitJsonTree1", async () => {
  const circuitJson = await runTscircuitCode(`

  export default () => (
    <board autoroutingDisabled>
      <group name="G1">
        <group name="G2">
          <resistor name="R1" resistance="1k" />
          <capacitor name="C1" capacitance="100nF" />
        </group>
        <resistor name="R2" resistance="2k" />
      </group>
    </board>
  )
  `)

  const tree = getCircuitJsonTree(circuitJson)

  expect(getStringFromCircuitJsonTree(tree)).toMatchInlineSnapshot(`
    "source_group_2
      G1
        G2
          R1
          C1
        R2"
  `)
})
