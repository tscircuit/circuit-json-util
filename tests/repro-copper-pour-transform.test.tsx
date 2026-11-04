import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { Point } from "@flatten-js/core"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { translate } from "transformation-matrix"
import { Circuit } from "tscircuit"
import { getPourPolygon, transformPCBElements } from "../index"

// Keep the original routes and solved pours; rerouting is unrelated to this API.
const controllerBoard: AnyCircuitElement[] = JSON.parse(
  readFileSync(
    new URL(
      "./fixtures/controller-board/controller.circuit.json",
      import.meta.url,
    ),
    "utf8",
  ),
)

test.failing("a TSX copper pour moves with its board", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={20} height={20} routingDisabled>
      <net name="GND" />
      <resistor name="R1" resistance="10k" footprint="0603" />
      <copperpour
        layer="bottom"
        connectsTo="net.GND"
        outline={[
          { x: -4, y: -3 },
          { x: 4, y: -3 },
          { x: 4, y: 3 },
          { x: -4, y: 3 },
        ]}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const original = circuit.getCircuitJson()
  const moved = transformPCBElements(
    structuredClone(original),
    translate(10, 0),
  )
  const originalPour = original.find(
    (element) => element.type === "pcb_copper_pour",
  )!
  const movedPour = moved.find((element) => element.type === "pcb_copper_pour")!
  expect(originalPour).toBeDefined()
  expect(getPourPolygon(movedPour).box.xmin).toBeCloseTo(
    getPourPolygon(originalPour).box.xmin + 10,
  )
})

test.failing(
  "the full controller's copper pours follow a 10 mm translation",
  () => {
    const moved = transformPCBElements(
      structuredClone(controllerBoard),
      translate(10, 0),
    )
    const originalPours = controllerBoard.filter(
      (element) =>
        element.type === "pcb_copper_pour" && element.shape === "brep",
    )
    const movedPours = moved.filter(
      (element) =>
        element.type === "pcb_copper_pour" && element.shape === "brep",
    )
    expect(originalPours).toHaveLength(3)
    expect(movedPours).toHaveLength(3)
    for (const [index, originalPour] of originalPours.entries()) {
      const movedPour = movedPours[index]!
      const originalRings = [
        originalPour.brep_shape.outer_ring,
        ...originalPour.brep_shape.inner_rings,
      ]
      const movedRings = [
        movedPour.brep_shape.outer_ring,
        ...movedPour.brep_shape.inner_rings,
      ]
      for (const [ringIndex, ring] of originalRings.entries()) {
        expect(movedRings[ringIndex]!.vertices).toEqual(
          ring.vertices.map((vertex) => ({ ...vertex, x: vertex.x + 10 })),
        )
      }
    }
  },
)

test.failing(
  "moving the full controller does not put ground copper over 3.3 V",
  () => {
    const moved = transformPCBElements(
      structuredClone(controllerBoard),
      translate(10, 0),
    )
    const groundPour = moved
      .filter((element) => element.type === "pcb_copper_pour")
      .find((pour) => pour.pcb_copper_pour_id === "pcb_copper_pour_3")!
    // Independently verified point inside the moved 3.3 V trace and stale pour.
    const supplyContact = new Point(10.451607725782175, 16.18368514779683)
    expect(getPourPolygon(groundPour).contains(supplyContact)).toBe(false)
  },
)

test("full controller copper before and after translation", async () => {
  await expect(
    convertCircuitJsonToPcbSvg(controllerBoard, { layer: "bottom" }),
  ).toMatchSvgSnapshot(import.meta.path, "original")
  const moved = transformPCBElements(
    structuredClone(controllerBoard),
    translate(10, 0),
  )
  await expect(
    convertCircuitJsonToPcbSvg(moved, { layer: "bottom" }),
  ).toMatchSvgSnapshot(import.meta.path, "translated")
})
