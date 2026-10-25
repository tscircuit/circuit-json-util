import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import {
  getBoundsOfPcbElements,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"

test("repro: polygon plated pad bounds collapse and skip a nearby test pad", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={8} height={6} routingDisabled>
      <platedhole
        shape="hole_with_polygon_pad"
        pcbX={1}
        pcbY={0.5}
        holeShape="oval"
        holeWidth={2}
        holeHeight={0.6}
        holeOffsetX={0.6}
        holeOffsetY={0.2}
        padOutline={[
          { x: -2, y: -1 },
          { x: 2, y: -1 },
          { x: 2, y: 1 },
          { x: -2, y: 1 },
        ]}
      />
      <smtpad pcbX={1.9} pcbY={0.7} shape="circle" radius={0.1} />
      <pcbnotetext text="Polygon copper: 4 x 2 mm" pcbY={2.3} fontSize={0.3} />
    </board>,
  )
  await circuit.renderUntilSettled()

  const hole = circuit.db.pcb_plated_hole.list()[0]!
  const pad = circuit.db.pcb_smtpad.list()[0]!
  const bounds = getBoundsOfPcbElements([hole])
  const candidates = getPcbElementsWithinBounds(
    [hole],
    getBoundsOfPcbElements([pad]),
  )
  expect(bounds).toEqual({ minX: 1, minY: 0.5, maxX: 1, maxY: 0.5 })
  expect(candidates).toHaveLength(0)

  circuit.db.pcb_note_rect.insert({
    center: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    },
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
    layer: "top",
    stroke_width: 0.05,
    color: "#ffdd00",
    has_stroke: true,
  })
  circuit.db.pcb_note_text.insert({
    text: `Computed bounds: ${bounds.maxX - bounds.minX} x ${bounds.maxY - bounds.minY} mm`,
    anchor_position: { x: 0, y: -1.6 },
    anchor_alignment: "center",
    layer: "top",
    font: "tscircuit2024",
    font_size: 0.28,
    color: "#ffdd00",
  })
  circuit.db.pcb_note_text.insert({
    text: `Pad candidates at test pad: ${candidates.length}`,
    anchor_position: { x: 0, y: -2.2 },
    anchor_alignment: "center",
    layer: "top",
    font: "tscircuit2024",
    font_size: 0.28,
    color: "#ffdd00",
  })
  expect(
    convertCircuitJsonToPcbSvg(circuit.getCircuitJson(), {
      showPcbNotes: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
