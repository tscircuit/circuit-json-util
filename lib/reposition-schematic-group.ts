import type { AnyCircuitElement } from "circuit-json"
import { buildSubtree } from "./subtree"
import { findBoundsAndCenter } from "./find-bounds-and-center"
import { transformSchematicElements } from "./transform-soup-elements"
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

  for (const childId of directChildren) {
    childGroupIds.push(...findAllDescendantGroupIds(circuitJson, childId))
  }

  return childGroupIds
}

export const repositionSchematicGroupTo = (
  circuitJson: AnyCircuitElement[],
  source_group_id: string,
  newCenter: { x: number; y: number },
) => {
  const allGroupIds = [
    source_group_id,
    ...findAllDescendantGroupIds(circuitJson, source_group_id),
  ]

  const allGroupElements = new Set<AnyCircuitElement>()

  for (const groupId of allGroupIds) {
    const groupElements = buildSubtree(circuitJson, {
      source_group_id: groupId,
    })
    groupElements.forEach((elm) => allGroupElements.add(elm))
  }

  const portIds = Array.from(allGroupElements)
    .filter((e) => e.type === "schematic_port")
    .map((e) => (e as any).schematic_port_id)

  const additionalTraces = circuitJson.filter((elm) => {
    if (elm.type !== "schematic_trace") return false
    if (allGroupElements.has(elm)) return false

    const anyElm: any = elm

    if (
      anyElm.start_schematic_port_id &&
      portIds.includes(anyElm.start_schematic_port_id)
    )
      return true
    if (
      anyElm.end_schematic_port_id &&
      portIds.includes(anyElm.end_schematic_port_id)
    )
      return true
    if (
      Array.isArray(anyElm.route) &&
      anyElm.route.some(
        (pt: any) =>
          (pt.start_schematic_port_id &&
            portIds.includes(pt.start_schematic_port_id)) ||
          (pt.end_schematic_port_id &&
            portIds.includes(pt.end_schematic_port_id)),
      )
    )
      return true

    return false
  })

  additionalTraces.forEach((trace) => allGroupElements.add(trace))

  const schematicElements = Array.from(allGroupElements).filter((elm) =>
    elm.type.startsWith("schematic_"),
  )
  if (schematicElements.length === 0) return

  const { center: currentCenter } = findBoundsAndCenter(schematicElements)

  const dx = newCenter.x - currentCenter.x
  const dy = newCenter.y - currentCenter.y

  const matrix = translate(dx, dy)

  transformSchematicElements(schematicElements, matrix)
}
