import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElement } from "../lib/transform-soup-elements"

test("rectangular cutout orientation stays behind during rotation", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={10} height={10} routingDisabled schAutoLayoutEnabled>
      <cutout shape="rect" pcbX={2} width={4} height={1} />
      <pcbnotetext
        text="Rotate rectangle 90 degrees"
        pcbY={-4}
        fontSize={0.5}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const cutout = circuitJson.find((element) => element.type === "pcb_cutout")!
  if (cutout.shape !== "rect") throw new Error("Expected rectangular cutout")

  transformPCBElement(cutout, rotateDEG(90))

  expect(cutout.center.x).toBeCloseTo(0)
  expect(cutout.center.y).toBeCloseTo(2)
  // Records the bug; the long side should be vertical after rotation.
  expect(cutout.rotation ?? 0).toBe(0)
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { showPcbNotes: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})
