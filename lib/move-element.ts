import type { AnyCircuitElement } from "circuit-json"
import { getElementPosition, setElementPosition } from "./get-element-position"

export const moveElement = (
  element: AnyCircuitElement,
  circuitJson: AnyCircuitElement[],
  pos: { x: number; y: number },
): boolean => {
  const current = getElementPosition(element)
  if (!current) return false

  const dx = pos.x - current.x
  const dy = pos.y - current.y

  setElementPosition(element, pos)

  if (dx !== 0 || dy !== 0) {
    if (element.type === "schematic_component") {
      const compId = (element as any).schematic_component_id
      for (const child of circuitJson) {
        if (
          child.type === "schematic_port" &&
          (child as any).schematic_component_id === compId
        ) {
          const cp = getElementPosition(child)
          if (cp) setElementPosition(child, { x: cp.x + dx, y: cp.y + dy })
        } else if (
          child.type === "schematic_text" &&
          (child as any).schematic_component_id === compId
        ) {
          const cp = getElementPosition(child)
          if (cp) setElementPosition(child, { x: cp.x + dx, y: cp.y + dy })
        }
      }
    }
  }

  return true
}

