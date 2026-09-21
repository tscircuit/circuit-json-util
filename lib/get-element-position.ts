import type { AnyCircuitElement } from "circuit-json"

export const getElementPosition = (
  elm: AnyCircuitElement,
): { x: number; y: number } | null => {
  if (
    "center" in elm &&
    (elm as any).center &&
    typeof (elm as any).center.x === "number" &&
    typeof (elm as any).center.y === "number"
  ) {
    return { x: (elm as any).center.x, y: (elm as any).center.y }
  }

  if (
    "position" in elm &&
    (elm as any).position &&
    typeof (elm as any).position.x === "number" &&
    typeof (elm as any).position.y === "number"
  ) {
    return { x: (elm as any).position.x, y: (elm as any).position.y }
  }

  if ("x" in elm && "y" in elm) {
    return { x: (elm as any).x, y: (elm as any).y }
  }

  return null
}

export const setElementPosition = (
  elm: AnyCircuitElement,
  pos: { x: number; y: number },
): void => {
  if ("center" in elm && (elm as any).center) {
    ;(elm as any).center.x = pos.x
    ;(elm as any).center.y = pos.y
    return
  }

  if ("position" in elm && (elm as any).position) {
    ;(elm as any).position.x = pos.x
    ;(elm as any).position.y = pos.y
    return
  }

  if ("x" in elm && "y" in elm) {
    ;(elm as any).x = pos.x
    ;(elm as any).y = pos.y
  }
}
