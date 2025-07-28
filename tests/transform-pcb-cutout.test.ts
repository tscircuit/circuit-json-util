import { test, expect } from "bun:test"
import { rotate } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"
import { runTscircuitCode } from "tscircuit"

// regression test for pcb_cutout rotation

test("transformPCBElements rotates pcb_cutout width/height", async () => {
  const circuitJson = await runTscircuitCode(`
export default () => (
  <board>
    <jumper name="J1" footprint="m2host" />
  </board>
)
`)
  const cutout = circuitJson.find(
    (e) => e.type === "pcb_cutout" && (e as any).shape === "rect",
  ) as any
  expect(cutout).toBeTruthy()
  const originalWidth = cutout.width
  const originalHeight = cutout.height

  transformPCBElements([cutout], rotate(Math.PI / 2))

  expect(cutout.width).toBeCloseTo(originalHeight)
  expect(cutout.height).toBeCloseTo(originalWidth)
})
