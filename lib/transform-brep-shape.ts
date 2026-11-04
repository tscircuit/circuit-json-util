import type { BRepShape, Ring } from "circuit-json"
import { type Matrix, applyToPoint } from "transformation-matrix"

const transformBrepRing = (ring: Ring, matrix: Matrix): Ring => {
  const vertices = ring.vertices.map((vertex) => ({
    ...vertex,
    ...applyToPoint(matrix, vertex),
  }))

  if (matrix.a * matrix.d - matrix.b * matrix.c < 0) {
    vertices.reverse()
    const vertexCount = vertices.length
    for (const [index, vertex] of vertices.entries()) {
      // Reflection reverses winding; reversing traversal moves each arc to its predecessor.
      const precedingIndex = (2 * vertexCount - index - 2) % vertexCount
      const precedingBulge = ring.vertices[precedingIndex]!.bulge
      delete vertex.bulge
      if (precedingBulge !== undefined) vertex.bulge = precedingBulge
    }
  }

  return { ...ring, vertices }
}

export const transformBrepShape = (
  brepShape: BRepShape,
  matrix: Matrix,
): BRepShape => ({
  ...brepShape,
  outer_ring: transformBrepRing(brepShape.outer_ring, matrix),
  inner_rings: brepShape.inner_rings.map((ring) =>
    transformBrepRing(ring, matrix),
  ),
})
