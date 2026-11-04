import { expect, test } from "bun:test"
import { schematic_net_label } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { type SchSymbol, symbols } from "schematic-symbols"
import { getSchematicElementBounds } from "../lib/get-schematic-element-bounds"
import { getSchematicNetLabelSymbolBounds } from "../lib/get-schematic-net-label-symbol-bounds"

// This screen uses public renderer output, not the utility's bounding helpers
// or symbol registry coordinates. It checks the paths requested in issue #207;
// font glyph bounds and stroke inflation are deliberately not claimed.
const renderedPathBounds = (
  label: ReturnType<typeof schematic_net_label.parse> & {
    display_superscript?: string
  },
) => {
  const svg = convertCircuitJsonToSchematicSvg([label], {
    width: 800,
    height: 800,
    grid: false,
  })
  const matrix = svg
    .match(/data-real-to-screen-transform="matrix\(([^)]+)\)"/)![1]!
    .split(",")
    .map(Number)
  const [a, b, c, d, e, f] = matrix as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  expect(b).toBe(0)
  expect(c).toBe(0)
  const points: { x: number; y: number }[] = []
  for (const match of svg.matchAll(
    /<path\b[^>]*class="sch-net-label-symbol-path"[^>]*d="([^"]+)"/g,
  )) {
    const values = match[1]!
      .match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!
      .map(Number)
    for (let i = 0; i < values.length; i += 2) {
      points.push({ x: (values[i]! - e) / a, y: (values[i + 1]! - f) / d })
    }
  }
  for (const match of svg.matchAll(
    /<circle\b[^>]*class="sch-net-label-symbol-circle"[^>]*>/g,
  )) {
    const attribute = (name: string) =>
      Number(match[0].match(new RegExp(`${name}="([^" ]+)"`))![1])
    const x = (attribute("cx") - e) / a
    const y = (attribute("cy") - f) / d
    const radius = Math.abs(attribute("r") / a)
    points.push(
      { x: x - radius, y: y - radius },
      { x: x + radius, y: y + radius },
    )
  }
  for (const match of svg.matchAll(
    /<rect\b[^>]*class="sch-net-label-symbol-box"[^>]*>/g,
  )) {
    const attribute = (name: string) =>
      Number(match[0].match(new RegExp(`${name}="([^" ]+)"`))![1])
    const x = attribute("x")
    const y = attribute("y")
    points.push(
      { x: (x - e) / a, y: (y - f) / d },
      {
        x: (x + attribute("width") - e) / a,
        y: (y + attribute("height") - f) / d,
      },
    )
  }
  expect(points.length).toBeGreaterThan(0)
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  }
}

// Compare symbol-only geometry so the legacy text envelope cannot hide an
// incorrect connection point, extra rotation, or centered-label translation.
for (const [symbol_name, text] of [
  ["ground_down", "GND"],
  ["vcc_left", "N_VCC"],
  ["ac_voltmeter_right", "WWWW i?🌍"],
  ["usbc", "N_"],
] as const) {
  for (const anchor_side of ["left", "right", "top", "bottom"] as const) {
    for (const anchored of [false, true]) {
      test(`exact symbol-only SVG geometry: ${symbol_name}, ${anchor_side}, ${anchored ? "anchored" : "centered"}`, () => {
        const label = schematic_net_label.parse({
          type: "schematic_net_label",
          schematic_net_label_id: "label",
          source_net_id: "net",
          text,
          symbol_name,
          anchor_side,
          center: { x: -3, y: 4 },
          ...(anchored ? { anchor_position: { x: 2, y: 3 } } : {}),
        })
        const actual = getSchematicNetLabelSymbolBounds(label)!
        const rendered = renderedPathBounds(label)
        for (const edge of ["minX", "minY", "maxX", "maxY"] as const) {
          expect(actual[edge]).toBeCloseTo(rendered[edge], 8)
        }
      })
    }
  }
}

// Requires the declared circuit-to-svg ^0.0.413: .393 predates superscript
// centering. Pass the structural extension directly; an older schema parser
// would discard display_superscript before the renderer sees it.
for (const display_superscript of ["2", "{2}"]) {
  for (const anchored of [false, true]) {
    test(`superscript public SVG geometry: ${display_superscript}, ${anchored ? "anchored" : "centered"}`, () => {
      const label = {
        ...schematic_net_label.parse({
          type: "schematic_net_label",
          schematic_net_label_id: "label",
          source_net_id: "net",
          text: "GND",
          symbol_name: "ground_right",
          anchor_side: "left",
          center: { x: -3, y: 4 },
          ...(anchored ? { anchor_position: { x: 2, y: 3 } } : {}),
        }),
        display_superscript,
      }
      const actual = getSchematicNetLabelSymbolBounds(label)!
      const rendered = renderedPathBounds(label)
      const bounds = getSchematicElementBounds(label)!
      for (const edge of ["minX", "minY", "maxX", "maxY"] as const) {
        expect(actual[edge]).toBeCloseTo(rendered[edge], 8)
      }
      expect(bounds.minX).toBeLessThanOrEqual(rendered.minX + 1e-8)
      expect(bounds.minY).toBeLessThanOrEqual(rendered.minY + 1e-8)
      expect(bounds.maxX).toBeGreaterThanOrEqual(rendered.maxX - 1e-8)
      expect(bounds.maxY).toBeGreaterThanOrEqual(rendered.maxY - 1e-8)
    })
  }
}

for (const family of ["ground", "vcc"] as const) {
  for (const [orientation, anchor_side] of [
    ["down", "top"],
    ["up", "bottom"],
    ["left", "right"],
    ["right", "left"],
  ] as const) {
    for (const anchored of [true, false]) {
      test(`${family}_${orientation} ${anchored ? "anchored" : "centered"} bounds enclose public SVG paths`, () => {
        const label = schematic_net_label.parse({
          type: "schematic_net_label",
          schematic_net_label_id: "label",
          source_net_id: "source_net",
          text: family === "ground" ? "GND" : "VCC",
          symbol_name: `${family}_${orientation}`,
          center: { x: 2, y: 3 },
          ...(anchored ? { anchor_position: { x: 2, y: 3 } } : {}),
          anchor_side,
        })
        const rendered = renderedPathBounds(label)
        const bounds = getSchematicElementBounds(label)!
        expect(bounds.minX).toBeLessThanOrEqual(rendered.minX + 1e-8)
        expect(bounds.minY).toBeLessThanOrEqual(rendered.minY + 1e-8)
        expect(bounds.maxX).toBeGreaterThanOrEqual(rendered.maxX - 1e-8)
        expect(bounds.maxY).toBeGreaterThanOrEqual(rendered.maxY - 1e-8)
      })
    }
  }
}

for (const [symbol_name, text, anchor_side, anchored] of [
  ["ac_voltmeter_right", "V", "left", true],
  ["usbc", "USB", "right", true],
  ["ground_down", "GND", "left", true],
  ["vcc_up", "N_VCC", "bottom", false],
  ["ground_right", "WWWW i?🌍", "top", false],
] as const) {
  test(`generic geometry: ${symbol_name}, ${text}, ${anchor_side}`, () => {
    const label = schematic_net_label.parse({
      type: "schematic_net_label",
      schematic_net_label_id: "label",
      source_net_id: "net",
      symbol_name,
      text,
      anchor_side,
      center: { x: -3, y: 4 },
      ...(anchored ? { anchor_position: { x: 2, y: 3 } } : {}),
    })
    const rendered = renderedPathBounds(label)
    const bounds = getSchematicElementBounds(label)!
    expect(bounds.minX).toBeLessThanOrEqual(rendered.minX + 1e-8)
    expect(bounds.minY).toBeLessThanOrEqual(rendered.minY + 1e-8)
    expect(bounds.maxX).toBeGreaterThanOrEqual(rendered.maxX - 1e-8)
    expect(bounds.maxY).toBeGreaterThanOrEqual(rendered.maxY - 1e-8)
  })
}

test("unknown names and empty symbol text retain the existing fallback", () => {
  const base = schematic_net_label.parse({
    type: "schematic_net_label",
    schematic_net_label_id: "label",
    source_net_id: "net",
    text: "GND",
    anchor_side: "left",
    center: { x: 0, y: 0 },
  })
  for (const symbol_name of ["no_such_symbol", "constructor", "__proto__"]) {
    expect(getSchematicElementBounds({ ...base, symbol_name })).toEqual(
      getSchematicElementBounds(base),
    )
  }
  expect(
    getSchematicElementBounds({
      ...base,
      text: "",
      symbol_name: "ground_down",
    }),
  ).toEqual(getSchematicElementBounds({ ...base, text: "" }))
})

test("centered symbol placement includes superscript spacing", () => {
  const base = schematic_net_label.parse({
    type: "schematic_net_label",
    schematic_net_label_id: "label",
    source_net_id: "net",
    text: "GND",
    anchor_side: "left",
    center: { x: 0, y: 0 },
    symbol_name: "ground_right",
  })
  const plain = getSchematicElementBounds(base)!
  const withSuperscript = getSchematicElementBounds({
    ...base,
    display_superscript: "2",
  })!
  // Current renderer: 0.08em gap + 13/27em glyph advance at 65% scale,
  // font size 0.18, half of the resulting width shifts the centered anchor.
  expect(plain.minX - withSuperscript.minX).toBeCloseTo(0.03536666666666667, 10)
})

test("all installed symbol registry entries enclose rendered geometry at both placements", () => {
  for (const symbol_name of Object.keys(symbols)) {
    for (const anchored of [true, false]) {
      const label = schematic_net_label.parse({
        type: "schematic_net_label",
        schematic_net_label_id: "label",
        source_net_id: "net",
        symbol_name,
        text: "GND",
        anchor_side: "left",
        center: { x: -3, y: 4 },
        ...(anchored ? { anchor_position: { x: 2, y: 3 } } : {}),
      })
      const rendered = renderedPathBounds(label)
      const bounds = getSchematicElementBounds(label)!
      expect(bounds.minX, `${symbol_name}: minX`).toBeLessThanOrEqual(
        rendered.minX + 1e-8,
      )
      expect(bounds.minY, `${symbol_name}: minY`).toBeLessThanOrEqual(
        rendered.minY + 1e-8,
      )
      expect(bounds.maxX, `${symbol_name}: maxX`).toBeGreaterThanOrEqual(
        rendered.maxX - 1e-8,
      )
      expect(bounds.maxY, `${symbol_name}: maxY`).toBeGreaterThanOrEqual(
        rendered.maxY - 1e-8,
      )
    }
  }
})

test("a registered box primitive follows the public renderer's top-left placement", () => {
  const registry = symbols as unknown as Record<string, SchSymbol>
  const name = "test_net_label_box_primitive"
  const previous = registry[name]
  registry[name] = {
    center: { x: 0, y: 0 },
    size: { width: 4, height: 5 },
    ports: [{ x: 1, y: 2, labels: ["1"] }],
    primitives: [
      {
        type: "path",
        points: [
          { x: 1, y: 2 },
          { x: 2, y: 2 },
        ],
        color: "primary",
      },
      { type: "box", x: -2, y: 3, width: 4, height: 5, anchor: "top_left" },
    ],
  }
  try {
    const label = schematic_net_label.parse({
      type: "schematic_net_label",
      schematic_net_label_id: "label",
      source_net_id: "net",
      text: "BOX",
      symbol_name: name,
      anchor_side: "left",
      center: { x: 0, y: 0 },
      anchor_position: { x: 10, y: 20 },
    })
    const rendered = renderedPathBounds(label)
    expect(rendered.minX).toBeCloseTo(7)
    expect(rendered.maxX).toBeCloseTo(11)
    expect(rendered.minY).toBeCloseTo(16)
    expect(rendered.maxY).toBeCloseTo(21)
    const bounds = getSchematicElementBounds(label)!
    expect(bounds.minX).toBeCloseTo(7)
    expect(bounds.maxX).toBeCloseTo(11)
    expect(bounds.minY).toBeCloseTo(16)
    expect(bounds.maxY).toBeCloseTo(21)
  } finally {
    if (previous) registry[name] = previous
    else delete registry[name]
  }
})
