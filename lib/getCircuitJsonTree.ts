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
  childNodes?: Array<CircuitJsonTreeNode>
  directChildrenElements?: Array<AnyCircuitElement>
}

export const getCircuitJsonTree = (
  circuitJson: AnyCircuitElement[],
  opts?: {
    source_group_id: string
  },
): CircuitJsonTreeNode => {
  // TODO
}
