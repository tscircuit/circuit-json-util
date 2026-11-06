import type {
  AnyCircuitElement,
  PcbComponent,
  PcbPlatedHole,
  PcbPort,
  PcbSmtPad,
  Point,
  SourcePort,
} from "circuit-json"
import {
  applyToPoint,
  compose,
  rotateDEG,
  translate,
} from "transformation-matrix"
import { getPcbElementBounds } from "./get-bounds-of-pcb-elements"
import { transformPCBElements } from "./transform-soup-elements"

type FootprintPad = PcbSmtPad | PcbPlatedHole
const quarterTurns = [0, 90, 180, 270] as const

export interface PcbFootprintOrientationPad {
  type: FootprintPad["type"]
  center: Point
  labels: string[]
}

const normalizeLabel = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/^pin(?=\d+$)/, "")

const isPinNumber = (label: string) => /^\d+$/.test(label)

/**
 * Extract contact labels and centers in the unrotated top-view footprint frame
 * (right-handed, mm, +X right, +Y up). When placement is supplied, the input
 * pads are in top-side board coordinates in the same axes and units.
 */
export const getPcbFootprintOrientationPads = (
  pads: readonly FootprintPad[],
  sourcePorts: readonly SourcePort[],
  pcbPorts: readonly PcbPort[],
  placement?: Pick<PcbComponent, "center" | "rotation">,
): PcbFootprintOrientationPad[] | null => {
  const localPads = placement
    ? (transformPCBElements(
        structuredClone([...pads]),
        compose(
          rotateDEG(-placement.rotation),
          translate(-placement.center.x, -placement.center.y),
        ),
      ) as FootprintPad[])
    : pads
  const sourcePortById = new Map(
    sourcePorts.map((port) => [port.source_port_id, port]),
  )
  const sourcePortIdByPcbPortId = new Map(
    pcbPorts.map((port) => [port.pcb_port_id, port.source_port_id]),
  )
  const orientationPads: PcbFootprintOrientationPad[] = []
  for (const pad of localPads) {
    let center: Point
    if (pad.type === "pcb_smtpad" && pad.shape === "polygon") {
      const bounds = getPcbElementBounds(pad)
      if (!bounds) return null
      center = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      }
    } else {
      center = { x: pad.x, y: pad.y }
    }
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return null

    const padLabels = (pad.port_hints ?? []).map(normalizeLabel)
    const sourcePortId = pad.pcb_port_id
      ? sourcePortIdByPcbPortId.get(pad.pcb_port_id)
      : undefined
    const candidates = sourcePortId
      ? [sourcePortById.get(sourcePortId)]
      : sourcePorts.filter((port) =>
          padLabels.includes(String(port.pin_number)),
        )
    const port = candidates.length === 1 ? candidates[0] : undefined
    const labels = port
      ? [port.name, ...(port.port_hints ?? []), String(port.pin_number)].map(
          normalizeLabel,
        )
      : padLabels
    orientationPads.push({
      type: pad.type,
      center,
      labels: [...new Set(labels.filter(Boolean))],
    })
  }
  return orientationPads
}

/**
 * Extract one top-side footprint from Circuit JSON. Pass the PCB component
 * for a placed board, or omit it for a supplier part containing one footprint.
 */
export const getPcbFootprintOrientationPadsFromCircuitJson = (
  circuitJson: readonly AnyCircuitElement[],
  placedFootprint?: PcbComponent,
): PcbFootprintOrientationPad[] | null => {
  const components = placedFootprint
    ? [placedFootprint]
    : circuitJson.filter((element) => element.type === "pcb_component")
  const [footprint] = components
  if (components.length > 1 || (footprint && footprint.layer !== "top"))
    return null
  const pads = circuitJson.filter(
    (element): element is FootprintPad =>
      (element.type === "pcb_smtpad" || element.type === "pcb_plated_hole") &&
      (!footprint || element.pcb_component_id === footprint.pcb_component_id),
  )
  if (
    pads.some((pad) => pad.type === "pcb_smtpad" && pad.layer !== "top") ||
    (!footprint && new Set(pads.map((pad) => pad.pcb_component_id)).size > 1)
  )
    return null
  const sourcePorts = circuitJson.filter(
    (element): element is SourcePort =>
      element.type === "source_port" &&
      (!footprint ||
        element.source_component_id === footprint.source_component_id),
  )
  if (
    !footprint &&
    new Set(sourcePorts.map((port) => port.source_component_id)).size > 1
  )
    return null
  return getPcbFootprintOrientationPads(
    pads,
    sourcePorts,
    circuitJson.filter((element) => element.type === "pcb_port"),
    footprint,
  )
}

const centroid = (pads: readonly PcbFootprintOrientationPad[]): Point => ({
  x: pads.reduce((sum, pad) => sum + pad.center.x, 0) / pads.length,
  y: pads.reduce((sum, pad) => sum + pad.center.y, 0) / pads.length,
})

// Allow micrometre rounding in CAD imports.
const centerToleranceMm = 0.01

/**
 * Find the unique CCW quarter-turn from the supplier footprint to the authored
 * footprint. Both use unrotated top-view pad centers in right-handed XY (mm).
 * The footprint origins may differ. Every pad center must match, and every
 * SMT contact (or every plated contact for a through-hole footprint) must
 * share a label that identifies it uniquely on each side.
 */
export const getPcbFootprintRotationOffset = (
  authored: readonly PcbFootprintOrientationPad[],
  supplier: readonly PcbFootprintOrientationPad[],
): (typeof quarterTurns)[number] | null => {
  if (authored.length < 2 || authored.length !== supplier.length) return null
  const contactType = authored.some((pad) => pad.type === "pcb_smtpad")
    ? "pcb_smtpad"
    : "pcb_plated_hole"
  const authoredContacts = authored.filter((pad) => pad.type === contactType)
  const supplierContacts = supplier.filter((pad) => pad.type === contactType)
  if (
    authoredContacts.length < 2 ||
    authoredContacts.length !== supplierContacts.length
  )
    return null

  // Numeric port IDs are usable only when both footprints use numbers alone.
  const numberedOnly = [...authoredContacts, ...supplierContacts].every((pad) =>
    pad.labels.every(isPinNumber),
  )
  const uniqueLabels = (contacts: PcbFootprintOrientationPad[]) => {
    const byLabel = new Map<string, PcbFootprintOrientationPad | null>()
    for (const contact of contacts) {
      for (const label of contact.labels) {
        if (isPinNumber(label) !== numberedOnly) continue
        byLabel.set(label, byLabel.has(label) ? null : contact)
      }
    }
    return byLabel
  }
  const authoredByLabel = uniqueLabels(authoredContacts)
  const supplierByLabel = uniqueLabels(supplierContacts)
  const authoredCenter = centroid(authored)
  const supplierCenter = centroid(supplier)
  const rotations = quarterTurns.filter((rotation) => {
    const supplierToAuthored = compose(
      translate(authoredCenter.x, authoredCenter.y),
      rotateDEG(rotation),
      translate(-supplierCenter.x, -supplierCenter.y),
    )
    const matchedPads = new Set<PcbFootprintOrientationPad>()
    return supplier.every((supplierPad) => {
      const center = applyToPoint(supplierToAuthored, supplierPad.center)
      const candidates = authored.filter(
        (pad) =>
          pad.type === supplierPad.type &&
          Math.hypot(pad.center.x - center.x, pad.center.y - center.y) <=
            centerToleranceMm,
      )
      const authoredPad = candidates[0]
      if (
        candidates.length !== 1 ||
        !authoredPad ||
        matchedPads.has(authoredPad)
      )
        return false
      matchedPads.add(authoredPad)
      return (
        supplierPad.type !== contactType ||
        supplierPad.labels.some(
          (label) =>
            supplierByLabel.get(label) === supplierPad &&
            authoredByLabel.get(label) === authoredPad,
        )
      )
    })
  })
  return rotations.length === 1 ? rotations[0]! : null
}
