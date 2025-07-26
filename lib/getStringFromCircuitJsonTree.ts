import type { CircuitJsonTreeNode } from "./getCircuitJsonTree"

export const getStringFromCircuitJsonTree = (
  circuitJsonTree: CircuitJsonTreeNode,
  indent = 0,
): string => {
  if (circuitJsonTree.nodeType === "component") {
    return `${" ".repeat(indent)}${circuitJsonTree.sourceComponent?.name ?? circuitJsonTree.sourceComponent?.source_component_id}`
  }
  const lines = []

  lines.push(
    `${" ".repeat(indent)}${circuitJsonTree.sourceGroup?.name ?? circuitJsonTree.sourceGroup?.source_group_id}`,
  )
  for (const child of circuitJsonTree.childNodes) {
    lines.push(getStringFromCircuitJsonTree(child, indent + 2))
  }
  return lines.join("\n")
}
