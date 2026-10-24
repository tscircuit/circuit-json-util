import type { PcbFabricationNoteText } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"
import { getPcbAlphabetTextBounds } from "./get-pcb-alphabet-text-bounds"

export const getPcbFabricationNoteTextBounds = (
  element: PcbFabricationNoteText,
): PcbBounds | null => {
  if (element.font !== undefined && element.font !== "tscircuit2024")
    return null
  return getPcbAlphabetTextBounds(
    element.text,
    element.font_size === undefined ? 1 : element.font_size,
    element.anchor_position,
    element.ccw_rotation === undefined ? 0 : element.ccw_rotation,
    element.anchor_alignment === undefined
      ? "center"
      : element.anchor_alignment,
  )
}
