import { test, expect } from "bun:test"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"
import { runTscircuitCode } from "tscircuit"

// This test reproduces the bug where rectangular board cutouts (pcb_keepout)
// did not have their width/height swapped when the board was rotated by 90°.
// The fix in `transform-soup-elements.ts` now ensures the dimensions are
// updated correctly.

test("transformPCBElements rotates pcb_keepout width/height on 90° rotation", async () => {
  const circuitJson = await runTscircuitCode(`

export default () => (
  <board>
    <jumper name="J1" footprint="m2host" />
  </board>
)
  `)

  // Extract the pcb_keepout elements produced by the m2host footprint.
  const keepouts = circuitJson.filter((e: any) => e.type === "pcb_keepout")
  expect(keepouts.length).toBeGreaterThan(0)

  // Capture the original dimensions so we can compare after rotation.
  const originalDims = keepouts.map((k: any) => ({ width: k.width, height: k.height }))

  // Apply a 90° rotation.
  transformPCBElements(circuitJson as any, rotateDEG(90))

  keepouts.forEach((k: any, idx: number) => {
    expect(k.width).toBeCloseTo(originalDims[idx].height)
    expect(k.height).toBeCloseTo(originalDims[idx].width)
  })
})