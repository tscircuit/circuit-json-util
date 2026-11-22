import type { AnyCircuitElement } from "circuit-json"
import { getPcbElementBounds } from "./get-bounds-of-pcb-elements"
import { getDebugLayoutObject } from "./utils/get-layout-debug-object"
import { isTruthy } from "./utils/is-truthy"

export const findBoundsAndCenter = (
  elements: AnyCircuitElement[],
): { center: { x: number; y: number }; width: number; height: number } => {
  const debugObjects = elements
    .filter(
      (elm) => elm.type.startsWith("pcb_") || elm.type.startsWith("schematic_"),
    )
    .concat(
      elements
        .filter(
          (elm) => elm.type === "pcb_trace" || elm.type === "schematic_trace",
        )
        // @ts-ignore
        .flatMap((elm: any) => elm.route),
    )
    .map((elm) => {
      const debugObject = getDebugLayoutObject(elm)
      if (!debugObject || elm.type !== "pcb_component") return debugObject

      // Group placement must use the same rotated envelope as PCB selection.
      const bounds = getPcbElementBounds(elm)
      if (!bounds) return debugObject
      return {
        ...debugObject,
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      }
    })
    .filter(isTruthy)

  if (debugObjects.length === 0)
    return { center: { x: 0, y: 0 }, width: 0, height: 0 }

  let minX = debugObjects[0]!.x - debugObjects[0]!.width / 2
  let maxX = debugObjects[0]!.x + debugObjects[0]!.width / 2
  let minY = debugObjects[0]!.y - debugObjects[0]!.height / 2
  let maxY = debugObjects[0]!.y + debugObjects[0]!.height / 2

  for (const obj of debugObjects.slice(1)) {
    minX = Math.min(minX, obj.x - obj.width / 2)
    maxX = Math.max(maxX, obj.x + obj.width / 2)
    minY = Math.min(minY, obj.y - obj.height / 2)
    maxY = Math.max(maxY, obj.y + obj.height / 2)
  }

  const width = maxX - minX
  const height = maxY - minY
  const center = { x: minX + width / 2, y: minY + height / 2 }

  return { center, width, height }
}
