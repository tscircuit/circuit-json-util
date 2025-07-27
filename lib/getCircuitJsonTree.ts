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

  for (const elm of circuitJson) {
    if (elm.type === "source_group" && elm.parent_source_group_id) {
      const parentId = elm.parent_source_group_id
      const childId = elm.source_group_id
      const children = groupChildMap.get(parentId) ?? []
      children.push(childId)
      groupChildMap.set(parentId, children)
      if (!groupChildMap.has(childId)) {
        groupChildMap.set(childId, [])
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

    // Create the tree node for this group
    const node: CircuitJsonTreeNode = {
      nodeType: "group",
      sourceGroup,
      otherChildElements: [],
      childNodes: [
        ...(groupChildMap
          .get(nextGroupId)
          ?.map((childId) => groupNodes.get(childId)!) ?? []),
        ...circuitJson
          .filter(
            (elm) =>
              elm.type === "source_component" &&
              elm.source_group_id === nextGroupId,
          )
          .map((elm) => {
            return {
              nodeType: "component",
              sourceComponent: elm,
              childNodes: [],
              otherChildElements: [
                ...circuitJson.filter(
                  (e) =>
                    e.type === "pcb_component" &&
                    e.source_component_id ===
                      (elm as SourceComponentBase).source_component_id,
                ),
              ], // TODO populate
            } as CircuitJsonTreeNode
          }),
      ],
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

  return groupNodes.get(opts?.source_group_id ?? lastGroupId)!
}
