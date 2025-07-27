import { test, expect } from "bun:test"
import { getCircuitJsonTree } from "../lib/getCircuitJsonTree"
import { runTscircuitCode } from "tscircuit"
import { getStringFromCircuitJsonTree } from "lib/getStringFromCircuitJsonTree"

// This test covers the scenario where a board contains components directly with
// no nested source groups. The root-level source_group corresponding to the
// board should appear at the top of the tree produced by getCircuitJsonTree.

test("getCircuitJsonTree - board only includes root source_group", async () => {
  const circuitJson = await runTscircuitCode(`

  export default () => (
    <board autoroutingDisabled>
      <resistor name="R1" resistance="1k" />
      <capacitor name="C1" capacitance="100nF" />
    </board>
  )
  `)

  const tree = getCircuitJsonTree(circuitJson)
  const treeStr = getStringFromCircuitJsonTree(tree)

  const rootGroup = circuitJson.find(
    (elm: any) => elm.type === "source_group" && !elm.parent_source_group_id,
  ) as any

  // The tree string representation should match the expected structure
  expect(getStringFromCircuitJsonTree(tree)).toMatchInlineSnapshot(`
    "source_group_0
      R1
      C1"
  `)
}) 