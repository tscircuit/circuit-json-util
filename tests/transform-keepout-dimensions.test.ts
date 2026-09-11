import { expect, test } from "bun:test"
import { pcb_keepout } from "circuit-json"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import { transformPCBElement, transformPCBElements } from "../index"

test("representable keepout transforms update rectangle dimensions and circle radii", () => {
  for (const batch of [false, true]) {
    for (const angle of [0, 90, 180, 270, -90]) {
      const rect = pcb_keepout.parse({
        type: "pcb_keepout",
        shape: "rect",
        pcb_keepout_id: "pcb_keepout_0",
        layers: ["top"],
        center: { x: 0, y: 0 },
        width: 20,
        height: 10,
      })
      const matrix = compose(translate(5, 7), rotateDEG(angle), scale(-2, 3))
      if (batch) transformPCBElements([rect], matrix)
      else transformPCBElement(rect, matrix)
      expect(rect.center).toEqual({ x: 5, y: 7 })
      expect(rect.shape).toBe("rect")
      if (rect.shape !== "rect") throw new Error("Expected a rectangle")
      const swap = Math.abs(angle % 180) === 90
      expect(rect.width).toBeCloseTo(swap ? 30 : 40, 10)
      expect(rect.height).toBeCloseTo(swap ? 40 : 30, 10)
      pcb_keepout.parse(rect)
    }
    const circle = pcb_keepout.parse({
      type: "pcb_keepout",
      shape: "circle",
      pcb_keepout_id: "pcb_keepout_1",
      layers: ["bottom"],
      center: { x: 0, y: 0 },
      radius: 2,
    })
    const matrix = compose(translate(5, 7), rotateDEG(37), scale(-3, 3))
    if (batch) transformPCBElements([circle], matrix)
    else transformPCBElement(circle, matrix)
    expect(circle.center).toEqual({ x: 5, y: 7 })
    if (circle.shape !== "circle") throw new Error("Expected a circle")
    expect(circle.radius).toBeCloseTo(6, 10)
    pcb_keepout.parse(circle)
  }
})
