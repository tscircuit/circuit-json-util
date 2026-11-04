import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import {
  getBoundsOfPcbElements,
  getPcbElementBounds,
  getPcbElementsWithinBounds,
} from "../lib/get-bounds-of-pcb-elements"

const lines = [
  {
    type: "pcb_silkscreen_line",
    pcb_silkscreen_line_id: "silkscreen_line",
    pcb_component_id: "component",
    layer: "top",
    x1: 5,
    y1: -3,
    x2: -2,
    y2: 4,
    stroke_width: 0.1,
  },
  {
    type: "pcb_note_line",
    pcb_note_line_id: "note_line",
    pcb_component_id: "component",
    layer: "top",
    x1: 5,
    y1: -3,
    x2: -2,
    y2: 4,
    stroke_width: 0.1,
  },
] satisfies AnyCircuitElement[]

for (const line of lines) {
  test(`${line.type} contributes both endpoints to PCB bounds`, () => {
    const expected = { minX: -2, minY: -3, maxX: 5, maxY: 4 }
    expect(getPcbElementBounds(line)).toEqual(expected)
    expect(getBoundsOfPcbElements([line])).toEqual(expected)
  })

  test(`${line.type} is returned by a bounds query intersecting its endpoints`, () => {
    expect(
      getPcbElementsWithinBounds([line], {
        minX: -3,
        minY: 3,
        maxX: -2,
        maxY: 5,
      }),
    ).toEqual([line])
    expect(
      getPcbElementsWithinBounds([line], {
        minX: 6,
        minY: -3,
        maxX: 7,
        maxY: 4,
      }),
    ).toEqual([])
  })

  test(`${line.type} preserves horizontal and vertical zero-span bounds`, () => {
    expect(getPcbElementBounds({ ...line, y2: line.y1 })).toEqual({
      minX: -2,
      minY: -3,
      maxX: 5,
      maxY: -3,
    })
    expect(getPcbElementBounds({ ...line, x2: line.x1 })).toEqual({
      minX: 5,
      minY: -3,
      maxX: 5,
      maxY: 4,
    })
  })
}
