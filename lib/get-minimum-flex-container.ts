export type Size = { width: number; height: number }

import type { FlexBoxOptions } from "@tscircuit/miniflex"
/**
 * Compute the smallest possible dimensions (width & height) for a flex container
 * so that **all** children fit without overflowing _before_ any flex grow / shrink
 * is applied. This is a very lightweight approximation – it only considers the
 * children's explicit `width`/`height` (or `flexBasis`) plus the configured gaps
 * and the main-axis stacking rules derived from the flex direction.
 *
 * This function purposely does **not** try to implement the full flexbox sizing
 * algorithm – we only need a quick estimate so that `RootFlexBox` can be
 * instantiated even when the user did not provide explicit dimensions for the
 * container (e.g. when laying out PCB components directly on the board level
 * instead of inside a sub-circuit).
 */
export function getMinimumFlexContainer(
  children: Array<{ width: number; height: number }>,
  options: FlexBoxOptions = {},
): Size {
  if (children.length === 0) return { width: 0, height: 0 }

  const direction = options.direction ?? "row"
  const columnGap = options.columnGap ?? 0
  const rowGap = options.rowGap ?? 0

  // Flexbox main-axis / cross-axis mapping --------------------------------
  const isRowDirection = direction === "row" || direction === "row-reverse"

  if (isRowDirection) {
    // Main-axis horizontally stacks children
    const totalChildWidth = children.reduce((sum, c) => sum + c.width, 0)
    const width = totalChildWidth + columnGap * Math.max(0, children.length - 1)

    const height = children.reduce((max, c) => Math.max(max, c.height), 0)
    return { width, height }
  } else {
    // Column direction – stack vertically
    const totalChildHeight = children.reduce((sum, c) => sum + c.height, 0)
    const height = totalChildHeight + rowGap * Math.max(0, children.length - 1)

    const width = children.reduce((max, c) => Math.max(max, c.width), 0)
    return { width, height }
  }
}
