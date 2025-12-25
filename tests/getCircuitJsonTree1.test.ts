import { test, expect } from "bun:test"
import { getCircuitJsonTree } from "../lib/getCircuitJsonTree"
import { runTscircuitCode } from "tscircuit"
import { getStringFromCircuitJsonTree } from "lib/getStringFromCircuitJsonTree"
import type { AnyCircuitElement } from "circuit-json"

test("getCircuitJsonTree1", async () => {
  const circuitJson = (await runTscircuitCode(`

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
  `)) as AnyCircuitElement[]

  const tree1 = getCircuitJsonTree(circuitJson)

  expect(getStringFromCircuitJsonTree(tree1)).toMatchInlineSnapshot(`
    "source_group_2
      G1
        G2
          R1
          C1
        R2"
  `)

  const tree2 = getCircuitJsonTree(circuitJson, {
    source_group_id: (circuitJson.find((elm: any) => elm.name === "G1") as any)
      ?.source_group_id!,
  })

  expect(getStringFromCircuitJsonTree(tree2)).toMatchInlineSnapshot(`
    "G1
      G2
        R1
        C1
      R2"
  `)
})
