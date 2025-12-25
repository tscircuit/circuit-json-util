import { test, expect } from "bun:test"
import { getCircuitJsonTree } from "../lib/getCircuitJsonTree"
import { runTscircuitCode } from "tscircuit"
import { getStringFromCircuitJsonTree } from "lib/getStringFromCircuitJsonTree"
import type { AnyCircuitElement } from "circuit-json"

test("getCircuitJsonTreeForInnerGroup", async () => {
  const circuitJson = (await runTscircuitCode(`
  export default () => (
    <board width="100mm" height="100mm" routingDisabled>
      <group name="G1" flex subcircuit width="20mm" height="20mm" justifyContent="space-between">
        <capacitor name="C1" capacitance="10uF" footprint="0603" />
        <capacitor name="C2" capacitance="10uF" footprint="0603" />
      </group>
    </board>
  )
  `)) as AnyCircuitElement[]

  // filter out only the pcb_board and the source_group for that board from the circuitJson
  const circuitJsonWithoutBoardAndSourceGroup = circuitJson.filter(
    (elm: any) =>
      elm.type !== "pcb_board" &&
      !(elm.type === "source_group" && !elm.parent_source_group_id), // Filter out root source_group (board level)
  ) as AnyCircuitElement[]

  const tree = getCircuitJsonTree(circuitJsonWithoutBoardAndSourceGroup)

  expect(getStringFromCircuitJsonTree(tree)).toMatchInlineSnapshot(`
    "G1
      C1
      C2"
  `)
})
