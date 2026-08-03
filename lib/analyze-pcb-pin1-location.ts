import type { PcbPin1Location } from "circuit-json"

type Point = { x: number; y: number }

export interface PcbPin1LocationElement {
  type: string
  x?: number
  y?: number
  points?: readonly Point[]
  port_hints?: readonly unknown[]
}

type Pin1Side = "leftside" | "rightside" | "topside" | "bottomside"
type Pin1Alignment = "left" | "right" | "top" | "bottom"

const PIN1_LOCATION_PARTS = {
  leftside_top: { side: "leftside", alignment: "top" },
  leftside_bottom: { side: "leftside", alignment: "bottom" },
  rightside_top: { side: "rightside", alignment: "top" },
  rightside_bottom: { side: "rightside", alignment: "bottom" },
  topside_left: { side: "topside", alignment: "left" },
  topside_right: { side: "topside", alignment: "right" },
  bottomside_left: { side: "bottomside", alignment: "left" },
  bottomside_right: { side: "bottomside", alignment: "right" },
} as const satisfies Record<
  PcbPin1Location,
  { side: Pin1Side; alignment: Pin1Alignment }
>

const PIN1_LOCATIONS = Object.keys(PIN1_LOCATION_PARTS) as PcbPin1Location[]

const getPadCenter = (pad: PcbPin1LocationElement): Point | null => {
  if (typeof pad.x === "number" && typeof pad.y === "number") {
    return { x: pad.x, y: pad.y }
  }

  if (pad.points && pad.points.length > 0) {
    const xs = pad.points.map((point) => point.x)
    const ys = pad.points.map((point) => point.y)
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
  }

  return null
}

const getPinNumber = (pad: PcbPin1LocationElement): number | null => {
  for (const hint of pad.port_hints ?? []) {
    const match = String(hint)
      .trim()
      .match(/^(?:pin)?(\d+)$/i)
    if (match) return Number.parseInt(match[1]!, 10)
  }
  return null
}

const pinMatchesLocation = (
  padCenters: Point[],
  pin1Center: Point,
  pin1Location: PcbPin1Location,
) => {
  const xs = padCenters.map((point) => point.x)
  const ys = padCenters.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const spanX = maxX - minX
  const spanY = maxY - minY
  const tolerance = Math.max(spanX, spanY, 1) * 1e-6
  const { side, alignment } = PIN1_LOCATION_PARTS[pin1Location]

  const onRequestedSide =
    (side === "leftside" && Math.abs(pin1Center.x - minX) <= tolerance) ||
    (side === "rightside" && Math.abs(pin1Center.x - maxX) <= tolerance) ||
    (side === "topside" && Math.abs(pin1Center.y - maxY) <= tolerance) ||
    (side === "bottomside" && Math.abs(pin1Center.y - minY) <= tolerance)

  const atRequestedAlignment =
    (alignment === "left" &&
      (spanX <= tolerance || pin1Center.x < centerX - tolerance)) ||
    (alignment === "right" &&
      (spanX <= tolerance || pin1Center.x > centerX + tolerance)) ||
    (alignment === "top" &&
      (spanY <= tolerance || pin1Center.y > centerY + tolerance)) ||
    (alignment === "bottom" &&
      (spanY <= tolerance || pin1Center.y < centerY - tolerance))

  return onRequestedSide && atRequestedAlignment
}

/**
 * Infers the semantic pin 1 location from PCB pad positions and numeric port
 * hints. Returns null when pin 1 is missing or the geometry cannot distinguish
 * a rotation from a reflection.
 */
export const analyzePcbPin1Location = (
  elements: readonly PcbPin1LocationElement[],
): PcbPin1Location | null => {
  const pads = elements.filter(
    (element) =>
      element.type === "pcb_smtpad" || element.type === "pcb_plated_hole",
  )
  const numberedPads = pads.map((pad) => ({
    center: getPadCenter(pad),
    pinNumber: getPinNumber(pad),
  }))
  const pin1Center = numberedPads.find((pad) => pad.pinNumber === 1)?.center
  const padCenters = numberedPads
    .map((pad) => pad.center)
    .filter((point) => point !== null)
  if (!pin1Center || padCenters.length === 0) return null

  const candidates = PIN1_LOCATIONS.filter((pin1Location) =>
    pinMatchesLocation(padCenters, pin1Center, pin1Location),
  )
  if (candidates.length === 1) return candidates[0]!
  if (candidates.length === 0) return null

  let nextNumberedPad: { center: Point; pinNumber: number } | undefined
  for (const pad of numberedPads) {
    if (!pad.center || pad.pinNumber === null || pad.pinNumber <= 1) continue
    if (!nextNumberedPad || pad.pinNumber < nextNumberedPad.pinNumber) {
      nextNumberedPad = { center: pad.center, pinNumber: pad.pinNumber }
    }
  }
  if (!nextNumberedPad) return null

  const xs = padCenters.map((point) => point.x)
  const ys = padCenters.map((point) => point.y)
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    1,
  )
  const tolerance = span * 1e-6
  const topologyCandidates = candidates.filter((pin1Location) => {
    const { side } = PIN1_LOCATION_PARTS[pin1Location]
    return side === "leftside" || side === "rightside"
      ? Math.abs(nextNumberedPad.center.x - pin1Center.x) <= tolerance
      : Math.abs(nextNumberedPad.center.y - pin1Center.y) <= tolerance
  })

  return topologyCandidates.length === 1 ? topologyCandidates[0]! : null
}
