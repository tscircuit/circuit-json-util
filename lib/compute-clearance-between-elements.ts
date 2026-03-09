import type { AnyCircuitElement } from "circuit-json"
import { decomposeClearanceIntoShapes } from "./shape-distances/decompose-clearance-into-shapes"
import { distanceBetweenShapes } from "./shape-distances/distance-between-shapes"

export const computeClearanceBetweenElements = (
  elm1: AnyCircuitElement,
  elm2: AnyCircuitElement,
): number => {
  const shapes1 = decomposeClearanceIntoShapes(elm1)
  const shapes2 = decomposeClearanceIntoShapes(elm2)

  if (shapes1.length === 0 || shapes2.length === 0) {
    return Number.POSITIVE_INFINITY
  }

  let minimumGap = Number.POSITIVE_INFINITY

  for (const shape1 of shapes1) {
    for (const shape2 of shapes2) {
      minimumGap = Math.min(minimumGap, distanceBetweenShapes(shape1, shape2))
    }
  }

  return minimumGap
}
