import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

const nodeExecutable = Bun.which("node")

test.skipIf(nodeExecutable === null)(
  "computes long schematic trace bounds in Node without exceeding argument limits",
  () => {
    // Bun optimizes large Math.min/Math.max spreads, so exercise V8 as well.
    // Strip types first to support Node versions without TypeScript loading.
    const source = readFileSync(
      new URL("../lib/get-schematic-element-bounds.ts", import.meta.url),
      "utf8",
    )
    const javascript = new Bun.Transpiler({ loader: "ts" }).transformSync(
      source,
    )
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
    const result = spawnSync(
      nodeExecutable!,
      [
        "--input-type=module",
        "--eval",
        `
          import assert from "node:assert/strict"
          const { getSchematicElementBounds } = await import(${JSON.stringify(moduleUrl)})
          const trace = {
            type: "schematic_trace",
            schematic_trace_id: "long_trace",
            edges: Array.from({ length: 100_000 }, (_, index) => ({
              from: { x: index, y: -index },
              to: { x: index + 1, y: -index - 1 },
            })),
            junctions: [{ x: -5, y: 8 }],
          }
          assert.deepEqual(getSchematicElementBounds(trace), {
            minX: -5.05,
            minY: -100_000.05,
            maxX: 100_000.05,
            maxY: 8.05,
            width: 100_005.1,
            height: 100_008.1,
            center: { x: 49_997.5, y: -49_996 },
          })
        `,
      ],
      { encoding: "utf8", timeout: 10_000 },
    )

    expect(result.error).toBeUndefined()
    expect(result.stderr).toBe("")
    expect(result.status).toBe(0)
  },
)
