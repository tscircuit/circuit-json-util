import type { PcbBoard } from "circuit-json"

export interface BoardBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  center: {
    x: number
    y: number
  }
}

export const getBoardBounds = (board: PcbBoard): BoardBounds => {
  // Numeric zero is a valid explicit dimension (e.g. board initialization
  // before sizing, or AutoSize of an empty board), so check for presence
  // rather than truthiness. Non-finite values are not valid dimensions.
  const hasExplicitDimensions =
    typeof board.width === "number" &&
    Number.isFinite(board.width) &&
    typeof board.height === "number" &&
    Number.isFinite(board.height) &&
    board.center != null

  if (hasExplicitDimensions) {
    const halfWidth = board.width / 2
    const halfHeight = board.height / 2

    return {
      minX: board.center.x - halfWidth,
      minY: board.center.y - halfHeight,
      maxX: board.center.x + halfWidth,
      maxY: board.center.y + halfHeight,
      width: board.width,
      height: board.height,
      center: {
        x: board.center.x,
        y: board.center.y,
      },
    }
  }

  if (!board.outline || board.outline.length === 0) {
    throw new Error(
      "Unable to compute board bounds. pcb_board must include width/height/center or a non-empty outline.",
    )
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of board.outline) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  const width = maxX - minX
  const height = maxY - minY

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    center: {
      x: minX + width / 2,
      y: minY + height / 2,
    },
  }
}
