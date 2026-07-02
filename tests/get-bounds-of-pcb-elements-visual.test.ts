import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import type { AnyCircuitElement } from "circuit-json"
import { expect, test } from "bun:test"
import { getBoundsOfPcbElements } from "../lib/get-bounds-of-pcb-elements"

const rotate = (x: number, y: number, deg: number) => {
  const t = (deg * Math.PI) / 180
  const c = Math.cos(t)
  const s = Math.sin(t)
  return [x * c - y * s, x * s + y * c] as const
}

// Draws the rotated component outline (blue) and the bounds box (red) so a
// reviewer can see whether the bounds actually enclose the component.
const renderBoundsSvg = (
  component: {
    center: { x: number; y: number }
    width: number
    height: number
    rotation: number
  },
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) => {
  const { center, width, height, rotation } = component
  const corners = (
    [
      [-width / 2, -height / 2],
      [width / 2, -height / 2],
      [width / 2, height / 2],
      [-width / 2, height / 2],
    ] as const
  ).map(([x, y]) => {
    const [rx, ry] = rotate(x, y, rotation)
    return [center.x + rx, center.y + ry] as const
  })

  // svg y is down, so negate y
  const svgPts = [
    ...corners.map(([x, y]) => [x, -y] as const),
    [bounds.minX, -bounds.minY] as const,
    [bounds.maxX, -bounds.maxY] as const,
  ]
  const pad = 0.6
  const minX = Math.min(...svgPts.map((p) => p[0])) - pad
  const minY = Math.min(...svgPts.map((p) => p[1])) - pad
  const maxX = Math.max(...svgPts.map((p) => p[0])) + pad
  const maxY = Math.max(...svgPts.map((p) => p[1])) + pad
  const f = (n: number) => Number(n.toFixed(4))

  const poly = corners.map(([x, y]) => `${f(x)},${f(-y)}`).join(" ")
  const bx = f(bounds.minX)
  const by = f(-bounds.maxY)
  const bw = f(bounds.maxX - bounds.minX)
  const bh = f(bounds.maxY - bounds.minY)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(minX)} ${f(minY)} ${f(maxX - minX)} ${f(maxY - minY)}">`,
    `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#dc2626" stroke-width="0.06"/>`,
    `<polygon points="${poly}" fill="#93c5fd" fill-opacity="0.6" stroke="#1d4ed8" stroke-width="0.06"/>`,
    `</svg>`,
  ].join("")
}

const expectSvgSnapshot = (svg: string, name: string) => {
  const dir = path.join(import.meta.dir, "__snapshots__")
  const snapshotPath = path.join(dir, `${name}.snap.svg`)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(snapshotPath) || process.env.BUN_UPDATE_SNAPSHOTS) {
    writeFileSync(snapshotPath, svg)
    return
  }
  expect(svg).toBe(readFileSync(snapshotPath, "utf-8"))
}

test("getBoundsOfPcbElements visual: bounds vs a rotated pcb_component", () => {
  const component = {
    type: "pcb_component" as const,
    pcb_component_id: "comp1",
    source_component_id: "source_comp1",
    center: { x: 0, y: 0 },
    width: 4,
    height: 2,
    rotation: 45,
    layer: "top" as const,
    obstructs_within_bounds: false,
  }
  const bounds = getBoundsOfPcbElements([component as AnyCircuitElement])
  expectSvgSnapshot(
    renderBoundsSvg(component, bounds),
    "bounds-rotated-component",
  )
})
