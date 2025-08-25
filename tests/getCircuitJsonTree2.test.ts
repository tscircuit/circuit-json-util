import { test, expect } from "bun:test"
import { getCircuitJsonTree } from "../lib/getCircuitJsonTree"
import { runTscircuitCode } from "tscircuit"
import { getStringFromCircuitJsonTree } from "lib/getStringFromCircuitJsonTree"

test("getCircuitJsonTree2", async () => {
  const circuitJson = await runTscircuitCode(`

  export default () => (
    <board autoroutingDisabled>
      <resistor name="R1" resistance="1k" />
      <group name="G1">
        <resistor name="R2" resistance="2k" />
      </group>
      <resistor name="R3" resistance="3k" />
    </board>
  )
  `)

  const tree1 = getCircuitJsonTree(circuitJson)

  expect(getStringFromCircuitJsonTree(tree1)).toMatchInlineSnapshot(`
    "source_group_1
      R1
      G1
        R2
      R3"
  `)
})
