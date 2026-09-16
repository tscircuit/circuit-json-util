import type { CadComponent, Point, Point3 } from "circuit-json"
import { mat4, quat } from "gl-matrix"

/** Measured native-axis bounds, in the model's original units. */
export interface CadModelBounds {
  min: Point3
  max: Point3
}

type CadModelFields = Pick<
  CadComponent,
  | "position"
  | "rotation"
  | "size"
  | "model_unit_to_mm_scale_factor"
  | "model_board_normal_direction"
  | "model_origin_position"
  | "model_origin_alignment"
> &
  Partial<Pick<CadComponent, "anchor_alignment" | "model_object_fit">>

const axes = ["x", "y", "z"] as const
const normalAlignments = {
  "x+": { rotation: [0, -90, 0], axis: "x", positive: true },
  "x-": { rotation: [0, 90, 0], axis: "x", positive: false },
  "y+": { rotation: [90, 0, 0], axis: "y", positive: true },
  "y-": { rotation: [-90, 0, 0], axis: "y", positive: false },
  "z+": { rotation: [0, 0, 0], axis: "z", positive: true },
  "z-": { rotation: [180, 0, 0], axis: "z", positive: false },
} satisfies Record<
  NonNullable<CadComponent["model_board_normal_direction"]>,
  { rotation: [number, number, number]; axis: keyof Point3; positive: boolean }
>

function assertPoint(point: Point3, name: string) {
  if (axes.some((axis) => !Number.isFinite(point[axis]))) {
    throw new Error(`${name} must have finite x, y and z coordinates`)
  }
}

/**
 * Original native vertices -> right-handed, Z-up board-relative millimetres.
 * Z=0 is the PCB midplane. Returns a serialized column-major affine matrix.
 * CAD rotation is intrinsic XYZ degrees and already includes layer orientation.
 * Apply this same matrix to actual geometry; bounds only resolve fit and datum.
 */
export function getCadModelToBoardTransform(
  cad: CadModelFields,
  {
    nativeBounds,
    boardContactPoint,
    boardCenter = { x: 0, y: 0 },
  }: {
    nativeBounds: CadModelBounds
    /** Measured contact datum in native axes/units, not an envelope estimate. */
    boardContactPoint?: Point3
    /** Circuit JSON world XY in millimetres; board Z remains unchanged. */
    boardCenter?: Point
  },
): number[] {
  assertPoint(nativeBounds.min, "nativeBounds.min")
  assertPoint(nativeBounds.max, "nativeBounds.max")
  if (axes.some((axis) => nativeBounds.min[axis] > nativeBounds.max[axis])) {
    throw new Error("nativeBounds.min must not exceed nativeBounds.max")
  }
  assertPoint(cad.position, "position")
  if (!Number.isFinite(boardCenter.x) || !Number.isFinite(boardCenter.y)) {
    throw new Error("boardCenter must have finite x and y coordinates")
  }
  const rotation = cad.rotation ?? { x: 0, y: 0, z: 0 }
  assertPoint(rotation, "rotation")
  if (boardContactPoint) assertPoint(boardContactPoint, "boardContactPoint")
  const units = cad.model_unit_to_mm_scale_factor ?? 1
  if (!Number.isFinite(units) || units <= 0) {
    throw new Error("model_unit_to_mm_scale_factor must be finite and positive")
  }
  const fit = cad.model_object_fit ?? "contain_within_bounds"
  if (fit !== "fill_bounds" && fit !== "contain_within_bounds") {
    throw new Error(`Unsupported model_object_fit: ${fit}`)
  }
  const direction = cad.model_board_normal_direction ?? "z+"
  if (!Object.hasOwn(normalAlignments, direction)) {
    throw new Error(
      "model_board_normal_direction must name one of the six axes",
    )
  }
  const normal = normalAlignments[direction]
  const scale = new Float64Array([units, units, units])
  if (cad.size) {
    const size = cad.size
    assertPoint(size, "size")
    if (axes.some((axis) => size[axis] <= 0)) {
      throw new Error("size dimensions must be positive")
    }
    const ratios = axes.map((axis) => {
      const extent = (nativeBounds.max[axis] - nativeBounds.min[axis]) * units
      // Match the legacy renderers: flat axes contribute ratio 1 in both modes.
      return extent === 0 ? 1 : size[axis] / extent
    })
    const uniform = Math.min(...ratios)
    for (let i = 0; i < 3; i++) {
      scale[i] = units * (fit === "fill_bounds" ? ratios[i]! : uniform)
    }
  }
  if (
    Array.from(scale).some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new Error("CAD model scale must be finite and positive")
  }

  let origin = cad.model_origin_position ?? { x: 0, y: 0, z: 0 }
  if (!cad.model_origin_position) {
    const alignment =
      cad.model_origin_alignment ?? cad.anchor_alignment ?? "unknown"
    if (alignment === "center_of_component_on_board_surface") {
      if (!boardContactPoint) {
        throw new Error(
          "center_of_component_on_board_surface requires a measured boardContactPoint",
        )
      }
      origin = boardContactPoint
    } else if (
      alignment === "center" ||
      alignment === "bottom_center_of_component"
    ) {
      origin = {
        x: nativeBounds.min.x / 2 + nativeBounds.max.x / 2,
        y: nativeBounds.min.y / 2 + nativeBounds.max.y / 2,
        z: nativeBounds.min.z / 2 + nativeBounds.max.z / 2,
      }
      // Cardinal alignment puts this native face on the aligned model's -Z side.
      if (alignment === "bottom_center_of_component") {
        origin[normal.axis] = normal.positive
          ? nativeBounds.min[normal.axis]
          : nativeBounds.max[normal.axis]
      }
    } else if (alignment !== "unknown") {
      throw new Error(`Unsupported model origin alignment: ${alignment}`)
    }
  }
  assertPoint(origin, "model_origin_position")

  // Subtract the world XY datum before combining with small model offsets.
  const matrix = mat4.fromRotationTranslation(
    new Float64Array(16),
    quat.fromEuler(
      new Float64Array(4),
      rotation.x,
      rotation.y,
      rotation.z,
      "xyz",
    ),
    [
      cad.position.x - boardCenter.x,
      cad.position.y - boardCenter.y,
      cad.position.z,
    ],
  )
  mat4.multiply(
    matrix,
    matrix,
    mat4.fromQuat(
      new Float64Array(16),
      quat.fromEuler(new Float64Array(4), ...normal.rotation, "xyz"),
    ),
  )
  mat4.scale(matrix, matrix, scale)
  mat4.translate(matrix, matrix, [-origin.x, -origin.y, -origin.z])
  const result = Array.from(matrix)
  if (result.some((value) => !Number.isFinite(value))) {
    throw new Error("CAD model transform must be finite")
  }
  return result
}
