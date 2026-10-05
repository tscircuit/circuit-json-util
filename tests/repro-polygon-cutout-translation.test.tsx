import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { translate } from "transformation-matrix"
import { transformPCBElement } from "../lib/transform-soup-elements"

test("polygon cutout vertices stay behind during translation", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={12} height={10} routingDisabled schAutoLayoutEnabled>
      <cutout
        shape="polygon"
        points={[
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 0, y: 2 },
        ]}
      />
      <pcbnotetext
        text="Translate triangle by (3, 1)"
        pcbY={-4}
        fontSize={0.5}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const cutout = circuitJson.find((element) => element.type === "pcb_cutout")!
  if (cutout.shape !== "polygon") throw new Error("Expected polygon cutout")

  transformPCBElement(cutout, translate(3, 1))

  // Records the bug; each vertex should receive the translation.
  expect(cutout.points).toEqual([
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
  ])
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { showPcbNotes: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})
