import { expect, test } from "bun:test"
import { any_circuit_element } from "circuit-json"
import { translate } from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"
import { createOpenings } from "./fixtures/soldermask-opening"

test("opening centers and polygon vertices move with component-owned PCB geometry", () => {
  for (const layer of ["top", "bottom"] as const) {
    const openings = createOpenings(layer)
    const original = structuredClone(openings)
    const returned = transformPCBElements(openings, translate(100, -70))
    for (const [index, opening] of openings.entries()) {
      const before = original[index]!
      expect(returned[index]).toBe(opening)
      expect(opening.pcb_soldermask_opening_id).toBe(
        before.pcb_soldermask_opening_id,
      )
      expect(opening).toMatchObject({
        layer,
        pcb_component_id: "component",
        pcb_group_id: "group",
        subcircuit_id: "subcircuit",
      })
      if (opening.shape === "polygon" && before.shape === "polygon") {
        expect(opening.points).toEqual(
          before.points.map(({ x, y }) => ({ x: x + 100, y: y - 70 })),
        )
      } else if (opening.shape !== "polygon" && before.shape !== "polygon") {
        expect(opening.x).toBe(before.x + 100)
        expect(opening.y).toBe(before.y - 70)
        if (opening.shape === "circle" && before.shape === "circle") {
          expect(opening.radius).toBe(before.radius)
        } else if (opening.shape !== "circle" && before.shape !== "circle") {
          expect(opening.width).toBe(before.width)
          expect(opening.height).toBe(before.height)
        }
      }
      expect(any_circuit_element.parse(opening)).toEqual(opening)
      expect(transformPCBElement(opening, translate(-100, 70))).toBe(opening)
    }
  }
})
