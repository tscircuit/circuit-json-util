import { expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { cju } from "../index"

test("subcircuit command - subtree for each board in two-boards.json", () => {
  const twoBoardsPath = path.join(__dirname, "assets", "two-boards.json")
  const twoBoardsJson = fs.readFileSync(twoBoardsPath, "utf-8")
  const soup: AnyCircuitElement[] = JSON.parse(twoBoardsJson)

  const db = cju(soup)

  // Find all boards
  const boards = db.source_board.list()

  expect(boards.length).toBe(2)

  // Test subcircuit for board 0 (subcircuit_source_group_2)
  const subcircuit0 = db.subtree({ subcircuit_id: "subcircuit_source_group_2" })
  const elements0 = subcircuit0.toArray()

  // Should include the board itself
  expect(
    elements0.some(
      (e) =>
        e.type === "source_board" && e.source_board_id === "source_board_0",
    ),
  ).toBe(true)

  // Should include the source group
  expect(
    elements0.some(
      (e) =>
        e.type === "source_group" && e.source_group_id === "source_group_2",
    ),
  ).toBe(true)

  // Should include source board
  expect(
    elements0.some(
      (e) =>
        e.type === "source_board" &&
        "source_board_id" in e &&
        (e as { source_board_id: string }).source_board_id === "source_board_0",
    ),
  ).toBe(true)

  // Should include schematic components (R2, R3, R4)
  const schematicComponents0 = elements0.filter(
    (e) => e.type === "schematic_component",
  )
  expect(schematicComponents0.length).toBe(3)

  // Should include PCB components (R2, R3, R4)
  const pcbComponents0 = elements0.filter((e) => e.type === "pcb_component")
  expect(pcbComponents0.length).toBe(3)

  // Should include source components (R2, R3, R4)
  const sourceComponents0 = elements0.filter(
    (e) => e.type === "source_component",
  )
  expect(sourceComponents0.length).toBe(3)

  // Test subcircuit for board 1 (subcircuit_source_group_5)
  const subcircuit1 = db.subtree({ subcircuit_id: "subcircuit_source_group_5" })
  const elements1 = subcircuit1.toArray()

  // Should include the board itself
  expect(
    elements1.some(
      (e) =>
        e.type === "source_board" && e.source_board_id === "source_board_1",
    ),
  ).toBe(true)

  // Should include the source group
  expect(
    elements1.some(
      (e) =>
        e.type === "source_group" && e.source_group_id === "source_group_5",
    ),
  ).toBe(true)

  // Should include PCB board
  expect(
    elements1.some(
      (e) =>
        e.type === "pcb_board" &&
        "source_board_id" in e &&
        (e as { source_board_id: string }).source_board_id === "source_board_1",
    ),
  ).toBe(true)

  // Should include schematic components (R1, R5, R6) from nested subcircuits
  const schematicComponents1 = elements1.filter(
    (e) => e.type === "schematic_component",
  )
  expect(schematicComponents1.length).toBe(3)

  // Should include PCB components (R1, R5, R6) from nested subcircuits
  const pcbComponents1 = elements1.filter((e) => e.type === "pcb_component")
  expect(pcbComponents1.length).toBe(3)

  // Should include source components (R1, R5, R6) from nested subcircuits
  const sourceComponents1 = elements1.filter(
    (e) => e.type === "source_component",
  )
  expect(sourceComponents1.length).toBe(3)

  // Verify no overlap between subcircuits
  const elementIds0 = new Set(
    elements0.map(
      (e) => `${e.type}:${(e as Record<string, unknown>)[`${e.type}_id`]};`,
    ),
  )
  const elementIds1 = new Set(
    elements1.map(
      (e) => `${e.type}:${(e as Record<string, unknown>)[`${e.type}_id`]};`,
    ),
  )

  // Should have some overlap in shared elements (like the root groups), but most should be different
  const intersection = new Set(
    [...elementIds0].filter((x) => elementIds1.has(x)),
  )
  expect(intersection.size).toBeLessThan(
    Math.min(elementIds0.size, elementIds1.size),
  )
})
