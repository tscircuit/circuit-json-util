import { expect, test } from "bun:test"
import { schematic_net_label } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { getSchematicElementBounds } from "../lib/get-schematic-element-bounds"

const makeLabel = (id: string, x: number, y: number) =>
  schematic_net_label.parse({
    type: "schematic_net_label",
    schematic_net_label_id: id,
    source_net_id: `net_${id}`,
    center: { x, y },
    anchor_position: { x, y },
    anchor_side: "left",
    text: "VCC",
  })

const getOutline = (svg: string, id: string) => {
  const paths = [...svg.matchAll(/<path\b[^>]*>/g)]
  const path = paths.find(
    ([tag]) =>
      tag.includes('class="net-label sch-net-label"') &&
      tag.includes(`data-schematic-net-label-id="${id}"`),
  )?.[0]
  expect(path).toBeDefined()
  const data = path!.match(/\sd="([^"]+)"/)![1]!
  const coordinates = [...data.matchAll(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)].map(
    ([value]) => Number(value),
  )
  expect(coordinates).toHaveLength(10)
  return Array.from({ length: 5 }, (_, i) => ({
    x: coordinates[i * 2]!,
    y: coordinates[i * 2 + 1]!,
  }))
}

const texts = [
  "WWWW",
  "iiii",
  "VCC",
  "D0_3.3V",
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)),
  "日本語",
  "🔋",
]

const groups = [
  {
    name: "plain",
    labels: texts.map((text) => ({
      text,
      display_superscript: undefined as string | undefined,
    })),
  },
  {
    name: "superscript",
    labels: ["", "2", "12", "WW", "ii", "日本語", "🔋"].map(
      (display_superscript) => ({ text: "VCC", display_superscript }),
    ),
  },
]

for (const group of groups) {
  for (const side of ["left", "right", "top", "bottom"] as const) {
    for (const anchored of [true, false]) {
      test(`rendered ${group.name} label bounds: ${side}, explicit anchor=${anchored}`, () => {
        for (const labelText of group.labels) {
          const label = {
            ...makeLabel("target", 4, 5),
            anchor_side: side,
            anchor_position: anchored ? { x: 2, y: 3 } : undefined,
            ...labelText,
          }
          const svg = convertCircuitJsonToSchematicSvg(
            [label, makeLabel("origin", 0, 0), makeLabel("unit", 1, 1)],
            { width: 1000, height: 1000, includeVersion: false },
          )
          if (labelText.display_superscript) {
            expect(svg).toContain('class="sch-net-label-superscript"')
          }
          const origin = getOutline(svg, "origin")[0]!
          const unit = getOutline(svg, "unit")[0]!
          const points = getOutline(svg, "target").map((point) => ({
            x: (point.x - origin.x) / (unit.x - origin.x),
            y: (point.y - origin.y) / (unit.y - origin.y),
          }))
          const actual = getSchematicElementBounds(label)!
          expect(actual.minX).toBeCloseTo(
            Math.min(...points.map((p) => p.x)),
            8,
          )
          expect(actual.maxX).toBeCloseTo(
            Math.max(...points.map((p) => p.x)),
            8,
          )
          expect(actual.minY).toBeCloseTo(
            Math.min(...points.map((p) => p.y)),
            8,
          )
          expect(actual.maxY).toBeCloseTo(
            Math.max(...points.map((p) => p.y)),
            8,
          )
        }
      })
    }
  }
}
