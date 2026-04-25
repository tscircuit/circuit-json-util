import type { AnyCircuitElement } from "circuit-json"
import { buildSubtree } from "./subtree"
import { findBoundsAndCenter } from "./find-bounds-and-center"

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

/**
 * Compute the bounding-box size (width & height) of a schematic group and
 * all of its nested sub-groups.
 *
 * Returns `null` when the group contains no schematic elements.
 */
export const getSchematicGroupSize = (
  circuitJson: AnyCircuitElement[],
  source_group_id: string,
): {
  width: number
  height: number
  center: { x: number; y: number }
} | null => {
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

  const schematicElements = Array.from(allGroupElements).filter((elm) =>
    elm.type.startsWith("schematic_"),
  )

  if (schematicElements.length === 0) return null

  const { width, height, center } = findBoundsAndCenter(schematicElements)

  return { width, height, center }
}
