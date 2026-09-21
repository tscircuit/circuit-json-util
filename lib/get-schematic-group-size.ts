import type { AnyCircuitElement } from "circuit-json"
import { findBoundsAndCenter } from "./find-bounds-and-center"
import { buildSubtree } from "./subtree"

export type SchematicGroupSize = {
  center: { x: number; y: number }
  width: number
  height: number
}

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

const getSourceGroupId = (
  circuitJson: AnyCircuitElement[],
  groupId: string,
): string => {
  const sourceGroup = circuitJson.find(
    (elm) =>
      elm.type === "source_group" && (elm as any).source_group_id === groupId,
  )
  if (sourceGroup) return (sourceGroup as any).source_group_id

  const schematicGroup = circuitJson.find(
    (elm) =>
      elm.type === "schematic_group" &&
      (elm as any).schematic_group_id === groupId,
  )
  return (schematicGroup as any)?.source_group_id ?? groupId
}

const getSchematicGroupIds = (
  circuitJson: AnyCircuitElement[],
  sourceGroupIds: string[],
  inputGroupId: string,
): Set<string> => {
  const schematicGroupIds = new Set<string>()

  for (const elm of circuitJson) {
    if (elm.type !== "schematic_group") continue

    const anyElm = elm as any
    if (sourceGroupIds.includes(anyElm.source_group_id)) {
      schematicGroupIds.add(anyElm.schematic_group_id)
    }
    if (anyElm.schematic_group_id === inputGroupId) {
      schematicGroupIds.add(anyElm.schematic_group_id)
    }
  }

  return schematicGroupIds
}

const isSchematicLayoutElement = (elm: AnyCircuitElement) =>
  elm.type.startsWith("schematic_") && elm.type !== "schematic_group"

export const getSchematicGroupSize = (
  circuitJson: AnyCircuitElement[],
  groupId: string,
): SchematicGroupSize => {
  const sourceGroupId = getSourceGroupId(circuitJson, groupId)
  const sourceGroupIds = [
    sourceGroupId,
    ...findAllDescendantGroupIds(circuitJson, sourceGroupId),
  ]
  const schematicGroupIds = getSchematicGroupIds(
    circuitJson,
    sourceGroupIds,
    groupId,
  )
  const groupElements = new Set<AnyCircuitElement>()

  for (const currentSourceGroupId of sourceGroupIds) {
    for (const elm of buildSubtree(circuitJson, {
      source_group_id: currentSourceGroupId,
    })) {
      if (isSchematicLayoutElement(elm)) groupElements.add(elm)
    }
  }

  for (const elm of circuitJson) {
    const schematicGroupId = (elm as any).schematic_group_id
    if (
      typeof schematicGroupId === "string" &&
      schematicGroupIds.has(schematicGroupId) &&
      isSchematicLayoutElement(elm)
    ) {
      groupElements.add(elm)
    }
  }

  const portIds = Array.from(groupElements)
    .filter((elm) => elm.type === "schematic_port")
    .map((elm) => (elm as any).schematic_port_id)

  for (const elm of circuitJson) {
    if (elm.type !== "schematic_trace") continue
    if (groupElements.has(elm)) continue

    const anyElm = elm as any
    if (portIds.includes(anyElm.start_schematic_port_id)) {
      groupElements.add(elm)
    } else if (portIds.includes(anyElm.end_schematic_port_id)) {
      groupElements.add(elm)
    } else if (
      Array.isArray(anyElm.route) &&
      anyElm.route.some(
        (pt: any) =>
          portIds.includes(pt.start_schematic_port_id) ||
          portIds.includes(pt.end_schematic_port_id),
      )
    ) {
      groupElements.add(elm)
    }
  }

  return findBoundsAndCenter(Array.from(groupElements))
}
