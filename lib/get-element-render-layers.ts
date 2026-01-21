import type { AnyCircuitElement, PcbRenderLayer } from "circuit-json"

export function getElementRenderLayers(
  element: AnyCircuitElement,
): PcbRenderLayer[] {
  // Copper elements (pads, traces, copper pour, copper text)
  if (element.type === "pcb_smtpad") {
    const layer = element.layer
    return [`${layer}_copper` as PcbRenderLayer]
  }

  if (element.type === "pcb_trace") {
    // Traces can span multiple layers, return all layers from route
    if (!element.route || !Array.isArray(element.route)) return []
    const layers = new Set<PcbRenderLayer>()
    for (const point of element.route) {
      if ("layer" in point && point.layer) {
        layers.add(`${point.layer}_copper` as PcbRenderLayer)
      }
    }
    return Array.from(layers)
  }

  if (element.type === "pcb_copper_pour") {
    const layer = element.layer
    return [`${layer}_copper` as PcbRenderLayer]
  }

  if (element.type === "pcb_copper_text") {
    const layer = element.layer
    return [`${layer}_copper` as PcbRenderLayer]
  }

  // Silkscreen elements
  if (
    element.type === "pcb_silkscreen_text" ||
    element.type === "pcb_silkscreen_rect" ||
    element.type === "pcb_silkscreen_circle" ||
    element.type === "pcb_silkscreen_line" ||
    element.type === "pcb_silkscreen_path"
  ) {
    const layer = element.layer
    return [`${layer}_silkscreen` as PcbRenderLayer]
  }

  // Fabrication note elements
  if (
    element.type === "pcb_fabrication_note_text" ||
    element.type === "pcb_fabrication_note_rect" ||
    element.type === "pcb_fabrication_note_path"
  ) {
    const layer = element.layer
    return [`${layer}_fabrication_note` as PcbRenderLayer]
  }

  // Elements without layer filtering (always drawn)
  // These include: pcb_board, pcb_hole, pcb_plated_hole, pcb_via, pcb_cutout,
  // pcb_note_rect, pcb_note_path, pcb_note_text, pcb_note_line, pcb_note_dimension
  return []
}
