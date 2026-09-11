import { expect, test } from "bun:test"
import { pcb_board, type PcbSmtPad } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { compose, rotateDEG, translate } from "transformation-matrix"
import { transformPCBElements } from "../index"

test("a polygon board outline follows its pads when rotated and translated", () => {
  const board = pcb_board.parse({
    type: "pcb_board",
    pcb_board_id: "pcb_board_0",
    shape: "polygon",
    center: { x: 0, y: 0 },
    width: 12,
    height: 12,
    thickness: 1.6,
    num_layers: 2,
    outline: [
      { x: -6, y: -6 },
      { x: 6, y: -6 },
      { x: 6, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 6 },
      { x: -6, y: 6 },
    ],
  })
  const pads = [
    { x: -4, y: -4 },
    { x: -4, y: 4 },
    { x: 4, y: -4 },
  ].map(
    (position, index) =>
      ({
        type: "pcb_smtpad",
        pcb_smtpad_id: `pcb_smtpad_${index}`,
        pcb_component_id: "pcb_component_0",
        layer: "top",
        shape: "rect",
        width: 1,
        height: 1,
        ...position,
      }) satisfies PcbSmtPad,
  )
  const circuitJson = [board, ...pads]
  // Keep both locations in view so a stale outline cannot hide off-screen.
  const options = {
    width: 900,
    height: 400,
    viewport: { minX: -8, minY: -8, maxX: 28, maxY: 8 },
    includeVersion: false,
  }
  expect(convertCircuitJsonToPcbSvg(circuitJson, options)).toMatchSvgSnapshot(
    import.meta.path,
    "original",
  )

  transformPCBElements(circuitJson, compose(translate(20, 0), rotateDEG(90)))

  expect(convertCircuitJsonToPcbSvg(circuitJson, options)).toMatchSvgSnapshot(
    import.meta.path,
    "transformed",
  )
  expect(board.center).toEqual({ x: 20, y: 0 })
  expect(board.outline).toEqual(
    [
      { x: 26, y: -6 },
      { x: 26, y: 6 },
      { x: 20, y: 6 },
      { x: 20, y: 2 },
      { x: 14, y: 2 },
      { x: 14, y: -6 },
    ].map(({ x, y }) => ({
      x: expect.closeTo(x, 10),
      y: expect.closeTo(y, 10),
    })),
  )
  expect(pads.map(({ x, y }) => ({ x, y }))).toEqual(
    [
      { x: 24, y: -4 },
      { x: 16, y: -4 },
      { x: 24, y: 4 },
    ].map(({ x, y }) => ({
      x: expect.closeTo(x, 10),
      y: expect.closeTo(y, 10),
    })),
  )
})
