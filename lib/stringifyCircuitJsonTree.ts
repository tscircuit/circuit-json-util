import type { CircuitJsonTreeNode } from "./subtree"

export const stringifyCircuitJsonTree = (
  tree: CircuitJsonTreeNode,
  indent = 0,
): string => {
  const lines: string[] = []

  const ind = " ".repeat(indent)

  lines.push(
    `${ind}${tree.type} (${tree.source_group_id ?? tree.source_component_id ?? tree.pcb_component_id ?? "unknown"})`,
  )

  return lines.join("\n")
}
