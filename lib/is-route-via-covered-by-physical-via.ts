import type { PcbVia } from "circuit-json"

type ViaGeometry = Pick<PcbVia, "x" | "y"> &
  Partial<Pick<PcbVia, "outer_diameter" | "hole_diameter">>

const getLayerDepth = (layer: string | undefined): number => {
  if (layer === "top") return 0
  if (layer === "bottom") return Number.POSITIVE_INFINITY
  const match = layer?.match(/^inner([1-9]\d*)$/)
  return match ? Number(match[1]) : Number.NaN
}

/**
 * Checks whether a physical via covers a route transition at the same position
 * with compatible dimensions. Callers must check electrical connectivity
 * separately. Missing route dimensions use the physical via's dimensions;
 * missing or unknown layers cannot establish coverage.
 */
export function isRouteViaCoveredByPhysicalVia(
  physicalVia: ViaGeometry & { layers?: readonly string[] },
  routeVia: ViaGeometry & { from_layer?: string; to_layer?: string },
): boolean {
  if (physicalVia.x !== routeVia.x || physicalVia.y !== routeVia.y) return false

  if (
    (routeVia.outer_diameter !== undefined &&
      routeVia.outer_diameter !== physicalVia.outer_diameter) ||
    (routeVia.hole_diameter !== undefined &&
      routeVia.hole_diameter !== physicalVia.hole_diameter)
  ) {
    return false
  }

  const physicalLayers = physicalVia.layers?.map(getLayerDepth)
  if (!physicalLayers?.length || physicalLayers.some(Number.isNaN)) return false

  const physicalTop = Math.min(...physicalLayers)
  const physicalBottom = Math.max(...physicalLayers)
  const from = getLayerDepth(routeVia.from_layer)
  const to = getLayerDepth(routeVia.to_layer)

  return (
    physicalTop < physicalBottom &&
    from !== to &&
    physicalTop <= Math.min(from, to) &&
    physicalBottom >= Math.max(from, to)
  )
}
