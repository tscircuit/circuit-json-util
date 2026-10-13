import type { PcbNoteText } from "circuit-json"
import type { PcbBounds } from "./get-bounds-of-pcb-elements"
import { getPcbAlphabetTextBounds } from "./get-pcb-alphabet-text-bounds"

/** 現行rendererの対応する注記について、保守的なAlphabetの物理枠を返します。 */
export const getPcbNoteTextBounds = (
  element: PcbNoteText,
): PcbBounds | null => {
  if (typeof element.text !== "string") return null
  // 注記はoverlayへ描画され、layerと鏡像の指定で文字を反転しません。
  return getPcbAlphabetTextBounds({
    text: element.text,
    font: element.font,
    font_size: element.font_size,
    anchor_position: element.anchor_position,
    anchor_alignment: element.anchor_alignment,
    layer: "top",
    ccw_rotation: 0,
    is_mirrored: false,
    is_knockout: false,
  })
}
