import type { AnyCircuitElement, PcbBoard } from "circuit-json"

export type AnyCircuitJsonId = string

export function createBoardOwnerMap(
  circuitJson: AnyCircuitElement[],
): Map<AnyCircuitJsonId, PcbBoard | undefined> {
  const boardOwnerMap = new Map<AnyCircuitJsonId, PcbBoard | undefined>()
  const parentById = new Map<AnyCircuitJsonId, AnyCircuitJsonId | undefined>()
  const sourceTraceParentById = new Map<AnyCircuitJsonId, AnyCircuitJsonId>()
  const boardsById = new Map<AnyCircuitJsonId, PcbBoard>()
  const sourceTraceIds = new Set<AnyCircuitJsonId>(
    circuitJson
      .filter((element) => element.type === "source_trace")
      .map((element) => element.source_trace_id),
  )

  for (const element of circuitJson) {
    switch (element.type) {
      case "pcb_board":
        boardsById.set(element.pcb_board_id, element)
        break
      case "source_group": {
        const parentGroupId =
          element.parent_subcircuit_id ?? element.parent_source_group_id
        parentById.set(
          element.source_group_id,
          element.subcircuit_id ?? parentGroupId,
        )
        if (element.is_subcircuit && element.subcircuit_id) {
          parentById.set(element.subcircuit_id, parentGroupId)
        }
        break
      }
      case "pcb_group":
        parentById.set(
          element.pcb_group_id,
          element.subcircuit_id ?? element.source_group_id,
        )
        break
      case "pcb_component":
        parentById.set(
          element.pcb_component_id,
          element.subcircuit_id ?? element.pcb_group_id,
        )
        break
      case "source_trace":
        parentById.set(element.source_trace_id, element.subcircuit_id)
        break
      case "pcb_trace":
        parentById.set(
          element.pcb_trace_id,
          element.subcircuit_id ??
            element.pcb_group_id ??
            element.pcb_component_id,
        )
        if (
          element.source_trace_id &&
          sourceTraceIds.has(element.source_trace_id)
        ) {
          sourceTraceParentById.set(
            element.pcb_trace_id,
            element.source_trace_id,
          )
        }
        break
      case "pcb_via":
        parentById.set(
          element.pcb_via_id,
          element.subcircuit_id ?? element.pcb_group_id ?? element.pcb_trace_id,
        )
        if (
          element.source_trace_id &&
          sourceTraceIds.has(element.source_trace_id)
        ) {
          sourceTraceParentById.set(element.pcb_via_id, element.source_trace_id)
        }
        break
    }
  }

  const boards = [...boardsById.values()]
  for (const board of boards) {
    boardOwnerMap.set(board.pcb_board_id, board)
    if (board.subcircuit_id) {
      boardOwnerMap.set(board.subcircuit_id, board)
    }
  }

  const singleBoard = boards.length === 1 ? boards[0] : undefined
  const resolvingIds = new Set<AnyCircuitJsonId>()

  function resolveBoard(id: AnyCircuitJsonId): PcbBoard | undefined {
    if (boardOwnerMap.has(id)) {
      return boardOwnerMap.get(id)
    }
    if (!parentById.has(id)) {
      return undefined
    }
    if (resolvingIds.has(id)) {
      return undefined
    }

    resolvingIds.add(id)
    const parentId = parentById.get(id)
    const sourceTraceParentId = sourceTraceParentById.get(id)
    let board = singleBoard
    if (parentId) {
      board = resolveBoard(parentId)
    } else if (sourceTraceParentId) {
      // Source ancestry supplements the existing single-board inference.
      board = resolveBoard(sourceTraceParentId) ?? singleBoard
    }
    resolvingIds.delete(id)

    boardOwnerMap.set(id, board)
    return board
  }

  for (const id of parentById.keys()) {
    resolveBoard(id)
  }
  return boardOwnerMap
}
