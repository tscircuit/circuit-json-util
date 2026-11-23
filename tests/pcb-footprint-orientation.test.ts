import { expect, test } from "bun:test"
import {
  type PcbFootprintOrientationPad,
  getPcbFootprintRotationOffset,
} from "../index"

test("rotation requires complete contact identity and geometric agreement", () => {
  const contact = (
    x: number,
    y: number,
    ...labels: string[]
  ): PcbFootprintOrientationPad => ({
    type: "pcb_smtpad",
    center: { x, y },
    labels,
  })
  const slot = (x: number, y: number): PcbFootprintOrientationPad => ({
    type: "pcb_plated_hole",
    center: { x, y },
    labels: [],
  })
  const supplier = [
    contact(-2, 1, "a1b12", "13"),
    contact(0, 1, "a4b9", "vbus2", "16"),
    contact(1, 1, "b4a9", "vbus1", "15"),
    slot(-1, -2),
  ]
  // Authored pads are quarter-turned and use a different footprint origin.
  // The auxiliary VBUS labels conflict while the physical contact names agree.
  const authored = [
    contact(4, -4, "a1b12", "17"),
    contact(4, -2, "a4b9", "vbus1", "18"),
    contact(4, -1, "b4a9", "vbus2", "27"),
    slot(7, -3),
  ]
  expect(getPcbFootprintRotationOffset(authored, supplier)).toBe(90)
  expect(
    getPcbFootprintRotationOffset(authored, [
      ...supplier.slice(0, 3),
      slot(-1, -2.1),
    ]),
  ).toBeNull()
  expect(
    getPcbFootprintRotationOffset(authored, [
      supplier[0]!,
      supplier[1]!,
      contact(1, 1, "unrelated"),
      supplier[3]!,
    ]),
  ).toBeNull()
  const symmetric = [contact(-1, 0, "ground"), contact(1, 0, "ground")]
  expect(getPcbFootprintRotationOffset(symmetric, symmetric)).toBeNull()
})
