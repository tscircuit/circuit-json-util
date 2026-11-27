import { expect, test } from "bun:test"
import { type PcbRenderLayer, any_circuit_element } from "circuit-json"
import { getElementRenderLayers } from "../lib/get-element-render-layers"

test.each(["top", "bottom"] as const)(
  "%s silkscreen graphics only match their own render layer",
  (layer) => {
    const graphic = any_circuit_element.parse({
      type: "pcb_silkscreen_graphic",
      pcb_silkscreen_graphic_id: "graphic_0",
      pcb_component_id: "component_0",
      layer,
      shape: "brep",
      brep_shape: {
        outer_ring: {
          vertices: [
            { x: 0, y: 0 },
            { x: 2, y: 0 },
            { x: 0, y: 1 },
          ],
        },
      },
    })
    const renderLayers = getElementRenderLayers(graphic)
    expect(renderLayers).toEqual([`${layer}_silkscreen`])

    // Renderers keep elements with no render layers visible in every pass.
    const requestedLayers: PcbRenderLayer[] = [
      "top_silkscreen",
      "bottom_silkscreen",
      "top_copper",
    ]
    const visibleIn = requestedLayers.filter(
      (requestedLayer) =>
        renderLayers.length === 0 || renderLayers.includes(requestedLayer),
    )
    expect(visibleIn).toEqual([`${layer}_silkscreen`])
  },
)
