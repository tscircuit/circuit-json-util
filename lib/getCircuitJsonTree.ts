import type {
  AnyCircuitElement,
  SourceComponentBase,
  SourceGroup,
} from "circuit-json"

/**
 * A tree of circuit elements. This is often used for layout because you want
 * to consider only the top-level elements of a group for layout (child groups
 * move together)
 */
export interface CircuitJsonTreeNode {
  nodeType: "group" | "component"
  sourceGroup?: SourceGroup
  sourceComponent?: SourceComponentBase
  childNodes: Array<CircuitJsonTreeNode>
  otherChildElements: Array<AnyCircuitElement>
}

export const getCircuitJsonTree = (
  circuitJson: AnyCircuitElement[],
  opts?: {
    source_group_id?: string
  },
): CircuitJsonTreeNode => {
  type ChildGroupId = string
  type ParentGroupId = string
  type GroupId = string
  const groupChildMap: Map<ParentGroupId, ChildGroupId[]> = new Map()

  // Get all source group IDs present in the circuit JSON
  const existingGroupIds = new Set<string>()
  for (const elm of circuitJson) {
    if (elm.type === "source_group") {
      existingGroupIds.add(elm.source_group_id)
    }
  }

  // Find orphaned groups (groups whose parent is not in the circuit JSON)
  const orphanedGroups: string[] = []

  for (const elm of circuitJson) {
    if (elm.type === "source_group" && elm.parent_source_group_id) {
      const parentId = elm.parent_source_group_id
      const childId = elm.source_group_id
      
      // If parent doesn't exist in circuit JSON, this is an orphaned group
      if (!existingGroupIds.has(parentId)) {
        orphanedGroups.push(childId)
        // Treat orphaned groups as root-level groups
        if (!groupChildMap.has(childId)) {
          groupChildMap.set(childId, [])
        }
      } else {
        // Normal parent-child relationship
        const children = groupChildMap.get(parentId) ?? []
        children.push(childId)
        groupChildMap.set(parentId, children)
        if (!groupChildMap.has(childId)) {
          groupChildMap.set(childId, [])
        }
      }
    }
  }

  // Ensure that every source_group, including root-level groups that have no parent,
  // is present in the groupChildMap. This guarantees that even standalone boards
  // (with no nested groups) are processed and appear at the top of the tree.
  for (const elm of circuitJson) {
    if (elm.type === "source_group" && !groupChildMap.has(elm.source_group_id)) {
      groupChildMap.set(elm.source_group_id, [])
    }
  }

  const groupNodes = new Map<GroupId, CircuitJsonTreeNode>()

  const getNextGroupId = () => {
    for (const [parentId, children] of groupChildMap) {
      if (groupNodes.has(parentId)) continue
      if (children.every((childId) => groupNodes.has(childId))) {
        return parentId
      }
    }
    return null
  }

  // Compute any node we have the dependencies for until we've computed all of
  // them
  let lastGroupId: GroupId | null = null
  while (true) {
    const nextGroupId = getNextGroupId()
    if (!nextGroupId) break

    const sourceGroup = circuitJson.find(
      (elm) =>
        elm.type === "source_group" && elm.source_group_id === nextGroupId,
    ) as SourceGroup

    // Create the tree node for this group. Child nodes should be in the order
    // they were defined in the original source code. To determine this, we use
    // the order of schematic elements which mirrors the authoring order.
    const childNodes: Array<CircuitJsonTreeNode> = []

    const schematicGroup = circuitJson.find(
      (elm) =>
        elm.type === "schematic_group" && elm.source_group_id === nextGroupId,
    ) as { schematic_group_id: string } | undefined
    const schematicGroupId = schematicGroup?.schematic_group_id

    for (const elm of circuitJson) {
      if (elm.type === "schematic_component" &&
          elm.schematic_group_id === schematicGroupId) {
        const sourceComponent = circuitJson.find(
          (e) =>
            e.type === "source_component" &&
            e.source_component_id === elm.source_component_id,
        ) as SourceComponentBase
        childNodes.push({
          nodeType: "component",
          sourceComponent,
          childNodes: [],
          otherChildElements: [
            ...circuitJson.filter(
              (e) =>
                e.type === "pcb_component" &&
                e.source_component_id === sourceComponent.source_component_id,
            ),
          ],
        })
      }
      if (elm.type === "schematic_group") {
        const sourceGroupId = elm.source_group_id
        if (sourceGroupId === nextGroupId) continue
        const sourceGroup = circuitJson.find(
          (e) =>
            e.type === "source_group" && e.source_group_id === sourceGroupId,
        ) as SourceGroup | undefined
        if (sourceGroup?.parent_source_group_id === nextGroupId) {
          childNodes.push(groupNodes.get(sourceGroupId)!)
        }
      }
    }

    const node: CircuitJsonTreeNode = {
      nodeType: "group",
      sourceGroup,
      otherChildElements: [],
      childNodes,
    }

    groupNodes.set(nextGroupId, node)
    lastGroupId = nextGroupId
  }

  if (!lastGroupId) {
    console.warn("No groups were processed, returning tree without sourceGroup")
    return {
      nodeType: "group",
      childNodes: [], // TODO populate
      otherChildElements: circuitJson,
    }
  }

  // Determine which group to return as root
  let rootGroupId: string | null = null
  if (opts && opts.source_group_id !== undefined) {
    // Use explicitly specified group
    rootGroupId = opts.source_group_id
  } else if (orphanedGroups.length > 0) {
    // Use the first orphaned group as root (most likely scenario when filtering circuit JSON)
    rootGroupId = orphanedGroups[0]!
  } else {
    // Fall back to the last processed group (typically the top-level parent)
    rootGroupId = lastGroupId as string | null
  }

  if (!rootGroupId) {
    console.warn("No valid root group found, returning tree without sourceGroup")
    return {
      nodeType: "group",
      childNodes: [], 
      otherChildElements: circuitJson,
    }
  }

  return groupNodes.get(rootGroupId)!
}
