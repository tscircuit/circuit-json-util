import type { AnyCircuitElement } from "circuit-json"
import { buildSubtree } from "./subtree"
import { findBoundsAndCenter } from "./find-bounds-and-center"
import { transformPCBElements } from "./transform-soup-elements"
import { translate } from "transformation-matrix"

const findAllDescendantGroupIds = (
  circuitJson: AnyCircuitElement[],
  parentGroupId: string,
): string[] => {
  const childGroupIds: string[] = []
  const directChildren = circuitJson
    .filter(
      (elm) =>
        elm.type === "source_group" &&
        (elm as any).parent_source_group_id === parentGroupId,
    )
    .map((elm) => (elm as any).source_group_id)

  childGroupIds.push(...directChildren)

  // Recursively find descendants of child groups
  for (const childId of directChildren) {
    childGroupIds.push(...findAllDescendantGroupIds(circuitJson, childId))
  }

  return childGroupIds
}

export const repositionPcbGroupTo = (
  circuitJson: AnyCircuitElement[],
  source_group_id: string,
  newCenter: { x: number; y: number },
) => {
  // Find all descendant group IDs
  const allGroupIds = [
    source_group_id,
    ...findAllDescendantGroupIds(circuitJson, source_group_id),
  ]

  // Get all elements for each group (including the main group and its descendants)
  const allGroupElements = new Set<AnyCircuitElement>()

  for (const groupId of allGroupIds) {
    const groupElements = buildSubtree(circuitJson, {
      source_group_id: groupId,
    })
    groupElements.forEach((elm) => allGroupElements.add(elm))
  }

  // Get all port IDs from elements in the group
  const portIds = Array.from(allGroupElements)
    .filter((e) => e.type === "pcb_port")
    .map((e) => (e as any).pcb_port_id)

  // Find additional traces that connect to these ports (buildSubtree might miss these)
  const additionalTraces = circuitJson.filter((elm) => {
    if (elm.type !== "pcb_trace") return false
    if (allGroupElements.has(elm)) return false // already included

    const anyElm: any = elm

    // Check direct port connections
    if (anyElm.start_pcb_port_id && portIds.includes(anyElm.start_pcb_port_id))
      return true
    if (anyElm.end_pcb_port_id && portIds.includes(anyElm.end_pcb_port_id))
      return true

    // Check route point connections
    if (
      Array.isArray(anyElm.route) &&
      anyElm.route.some(
        (pt: any) =>
          (pt.start_pcb_port_id && portIds.includes(pt.start_pcb_port_id)) ||
          (pt.end_pcb_port_id && portIds.includes(pt.end_pcb_port_id)),
      )
    )
      return true

    return false
  })

  // Add additional traces to the elements to move
  additionalTraces.forEach((trace) => allGroupElements.add(trace))

  // Filter to only PCB elements that can be repositioned
  const pcbElements = Array.from(allGroupElements).filter((elm) =>
    elm.type.startsWith("pcb_"),
  )

  if (pcbElements.length === 0) return

  // Calculate current bounds and center of the group
  const { center: currentCenter } = findBoundsAndCenter(pcbElements)

  // Calculate translation needed
  const dx = newCenter.x - currentCenter.x
  const dy = newCenter.y - currentCenter.y

  // Create translation matrix
  const matrix = translate(dx, dy)

  // Apply transformation to all PCB elements in the group
  transformPCBElements(pcbElements, matrix)
}
