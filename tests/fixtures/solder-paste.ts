import type { PcbSolderPasteRect } from "circuit-json"

export const createPaste = (): PcbSolderPasteRect => ({
  type: "pcb_solder_paste",
  pcb_solder_paste_id: "paste",
  pcb_smtpad_id: "pad",
  shape: "rect",
  layer: "top",
  x: 0,
  y: 0,
  width: 4,
  height: 2,
})
