import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { rotateDEG } from "transformation-matrix"
import { transformPCBElement } from "../lib/transform-soup-elements"

test("rectangular cutout orientation follows rotation", async () => {
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
  expect(cutout.rotation).toBeCloseTo(90)
  expect(cutout.width).toBe(4)
  expect(cutout.height).toBe(1)
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { showPcbNotes: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})
