import type { PcbVia } from "circuit-json"

type ViaGeometry = Pick<PcbVia, "x" | "y"> &
  Partial<Pick<PcbVia, "outer_diameter" | "hole_diameter">>

type ViaWithLayers = ViaGeometry & { layers?: readonly string[] }
type RouteViaGeometry = ViaGeometry & {
  from_layer?: string
  to_layer?: string
}
type RouteViaCoverageOptions = {
  viaWithLayers: ViaWithLayers
  routeVia: RouteViaGeometry
  positionTolerance?: number
}

const getLayerDepth = (layer: string | undefined): number => {
  if (layer === "top") return 0
  if (layer === "bottom") return Number.POSITIVE_INFINITY
  const match = layer?.match(/^inner([1-9]\d*)$/)
  return match ? Number(match[1]) : Number.NaN
}

/**
 * Checks whether a via with explicit layers covers a route transition at the
 * same position with compatible dimensions. Callers must check electrical
 * connectivity separately. Missing route dimensions use the layered via's dimensions;
 * missing or unknown layers cannot establish coverage.
 * Position tolerance is an inclusive limit per axis in mm, defaulting to zero.
 * Use the named options object to opt in; two-argument calls remain exact.
 * Neither input is modified.
 */
export function isRouteViaCoveredByPhysicalVia(
  options: RouteViaCoverageOptions,
): boolean
export function isRouteViaCoveredByPhysicalVia(
  viaWithLayers: ViaWithLayers,
  routeVia: RouteViaGeometry,
): boolean
export function isRouteViaCoveredByPhysicalVia(
  viaWithLayersOrOptions: ViaWithLayers | RouteViaCoverageOptions,
  legacyRouteVia?: RouteViaGeometry,
): boolean {
  if (!("viaWithLayers" in viaWithLayersOrOptions)) {
    if (!legacyRouteVia) return false
    return isRouteViaCoveredByPhysicalVia({
      viaWithLayers: viaWithLayersOrOptions,
      routeVia: legacyRouteVia,
    })
  }

  const {
    viaWithLayers,
    routeVia,
    positionTolerance = 0,
  } = viaWithLayersOrOptions
  const samePosition =
    Math.abs(viaWithLayers.x - routeVia.x) <= positionTolerance &&
    Math.abs(viaWithLayers.y - routeVia.y) <= positionTolerance
  if (!samePosition) return false

  if (
    (routeVia.outer_diameter !== undefined &&
      routeVia.outer_diameter !== viaWithLayers.outer_diameter) ||
    (routeVia.hole_diameter !== undefined &&
      routeVia.hole_diameter !== viaWithLayers.hole_diameter)
  ) {
    return false
  }

  const viaLayerDepths = viaWithLayers.layers?.map(getLayerDepth)
  if (!viaLayerDepths?.length || viaLayerDepths.some(Number.isNaN)) return false

  const viaTopDepth = Math.min(...viaLayerDepths)
  const viaBottomDepth = Math.max(...viaLayerDepths)
  const fromLayerDepth = getLayerDepth(routeVia.from_layer)
  const toLayerDepth = getLayerDepth(routeVia.to_layer)

  return (
    viaTopDepth < viaBottomDepth &&
    fromLayerDepth !== toLayerDepth &&
    viaTopDepth <= Math.min(fromLayerDepth, toLayerDepth) &&
    viaBottomDepth >= Math.max(fromLayerDepth, toLayerDepth)
  )
}
