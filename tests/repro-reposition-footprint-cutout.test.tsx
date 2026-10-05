import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { translate } from "transformation-matrix"
import { transformPCBElements } from "../lib/transform-soup-elements"

test("repositioning a footprint leaves its rectangular cutout behind", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={16} height={10} routingDisabled schAutoLayoutEnabled>
      <chip
        name="U1"
        footprint={
          <footprint>
            <smtpad
              shape="rect"
              width={1}
              height={1}
              pcbX={-3}
              pcbY={-1}
              portHints={["pin1"]}
            />
            <smtpad
              shape="rect"
              width={1}
              height={1}
              pcbX={3}
              pcbY={1}
              portHints={["pin2"]}
            />
            <cutout shape="rect" width={3} height={2} />
          </footprint>
        }
      />
      <pcbnotetext
        text="Cutout should stay between pads"
        pcbY={-4}
        fontSize={0.6}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const component = circuitJson.find(
    (element) => element.type === "pcb_component",
  )!

  // Component repositioning uses this transform to move footprint geometry.
  transformPCBElements(circuitJson, translate(3, 1))

  expect(component.center).toEqual({ x: 3, y: 1 })
  expect(
    circuitJson
      .filter(
        (element) => element.type === "pcb_smtpad" && element.shape === "rect",
      )
      .map((pad) => ({ x: pad.x, y: pad.y })),
  ).toEqual([
    { x: 0, y: 0 },
    { x: 6, y: 2 },
  ])
  const cutout = circuitJson.find((element) => element.type === "pcb_cutout")!
  expect(cutout.shape).toBe("rect")
  if (cutout.shape !== "rect") throw new Error("Expected rectangular cutout")
  // Captures the bug: the expected cutout center is (3, 1).
  expect(cutout.center).toEqual({ x: 0, y: 0 })
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { showPcbNotes: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})
