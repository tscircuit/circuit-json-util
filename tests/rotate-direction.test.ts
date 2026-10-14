import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { rotateDirection } from "../lib/direction-to-vec"

const directions = ["up", "right", "down", "left"] as const

test("quarter turns preserve clockwise and counterclockwise ordering", () => {
  for (const [index, direction] of directions.entries()) {
    for (let turns = -12; turns <= 12; turns++) {
      const expected = directions[(((index + turns) % 4) + 4) % 4]
      expect(rotateDirection(direction, turns)).toBe(expected!)
    }
  }
})

test("finite fractional turns retain their existing behavior", () => {
  expect(rotateDirection("up", 0.5)).toBe("up")
  expect(rotateDirection("up", 1.5)).toBe("right")
  expect(rotateDirection("up", -0.5)).toBe("left")
  expect(rotateDirection("up", -1.5)).toBe("down")
})

// Isolate these calls so a regression cannot hang the test runner itself.
for (const [turns, expected] of [
  [2 ** 54, "up"],
  [-(2 ** 54), "up"],
  [Number.MAX_SAFE_INTEGER, "left"],
] as const) {
  test(`large turn count ${turns} terminates with ${expected}`, () => {
    const sourcePath = fileURLToPath(
      new URL("../lib/direction-to-vec.ts", import.meta.url),
    )
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `import { rotateDirection } from ${JSON.stringify(sourcePath)}; console.log(rotateDirection("up", ${turns}));`,
      ],
      { encoding: "utf8", timeout: 2000 },
    )
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toBe(expected)
  })
}

test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  "rejects non-finite turn count %s",
  (turns) => {
    // Use a child process: the original implementation hangs for infinities.
    const sourcePath = fileURLToPath(
      new URL("../lib/direction-to-vec.ts", import.meta.url),
    )
    const result = spawnSync(
      process.execPath,
      [
        "-e",
        `import { rotateDirection } from ${JSON.stringify(sourcePath)};
try { rotateDirection("up", ${String(turns)}); process.exit(1) }
catch (error) { process.exit(error instanceof RangeError ? 0 : 2) }`,
      ],
      { encoding: "utf8", timeout: 2000 },
    )
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
  },
)
