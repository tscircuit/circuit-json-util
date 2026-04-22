import { expect, test } from "bun:test"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import type { AnyCircuitElement, PcbComponent } from "circuit-json"
import { transformPCBElements } from "../lib/transform-soup-elements"

const createPcbComponent = (
  overrides: Partial<Record<string, unknown>> = {},
): AnyCircuitElement => ({
  type: "pcb_component",
  pcb_component_id: "pc1",
  source_component_id: "sc1",
  layer: "top",
  center: { x: 1, y: 2 },
  width: 4,
  height: 2,
  rotation: 0,
  obstructs_within_bounds: true,
  ...overrides,
})

test("transformPCBElements moves pcb_silkscreen_path route", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_silkscreen_path",
      pcb_silkscreen_path_id: "sp1",
      pcb_component_id: "pc1",
      layer: "top",
      route: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      stroke_width: 0.2,
    } as any,
  ]

  transformPCBElements(elms, translate(2, 3))

  const path = elms[0] as any
  expect(path.route[0]).toEqual({ x: 2, y: 3 })
  expect(path.route[1]).toEqual({ x: 3, y: 4 })
})

test("transformPCBElements moves pcb_note_text anchor_position", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_note_text",
      pcb_note_text_id: "nt1",
      text: "Note text",
      anchor_position: { x: 1, y: 2 },
      anchor_alignment: "center",
      font_size: 1,
      layer: "top",
    } as any,
  ]

  transformPCBElements(elms, translate(5, 10))

  const text = elms[0] as any
  expect(text.anchor_position).toEqual({ x: 6, y: 12 })
})

test("transformPCBElements moves pcb_note_rect center", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_note_rect",
      pcb_note_rect_id: "nr1",
      center: { x: 3, y: 4 },
      width: 2,
      height: 1,
      layer: "top",
    } as any,
  ]

  transformPCBElements(elms, translate(7, 8))

  const rect = elms[0] as any
  expect(rect.center).toEqual({ x: 10, y: 12 })
})

test("transformPCBElements moves pcb_note_path route", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_note_path",
      pcb_note_path_id: "np1",
      layer: "top",
      route: [
        { x: 0, y: 0 },
        { x: 2, y: 3 },
        { x: 4, y: 1 },
      ],
      stroke_width: 0.1,
    } as any,
  ]

  transformPCBElements(elms, translate(1, 2))

  const path = elms[0] as any
  expect(path.route[0]).toEqual({ x: 1, y: 2 })
  expect(path.route[1]).toEqual({ x: 3, y: 5 })
  expect(path.route[2]).toEqual({ x: 5, y: 3 })
})

test("transformPCBElements moves pcb_courtyard_rect center", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_rect",
      pcb_courtyard_rect_id: "cr1",
      pcb_component_id: "pc1",
      center: { x: 1, y: 2 },
      width: 3,
      height: 2,
      layer: "top",
    } as any,
  ]

  transformPCBElements(elms, translate(5, 10))

  const rect = elms[0] as any
  expect(rect.center).toEqual({ x: 6, y: 12 })
})

test("transformPCBElements moves pcb_courtyard_circle center", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_circle",
      pcb_courtyard_circle_id: "cc1",
      pcb_component_id: "pc1",
      center: { x: 2, y: 3 },
      radius: 1,
      layer: "top",
    } as any,
  ]

  transformPCBElements(elms, translate(3, 4))

  const circle = elms[0] as any
  expect(circle.center).toEqual({ x: 5, y: 7 })
})

test("transformPCBElements moves pcb_courtyard_outline points", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_outline",
      pcb_courtyard_outline_id: "co1",
      pcb_component_id: "pc1",
      layer: "top",
      outline: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ],
    } as any,
  ]

  transformPCBElements(elms, translate(2, 3))

  const outline = elms[0] as any
  expect(outline.outline[0]).toEqual({ x: 2, y: 3 })
  expect(outline.outline[1]).toEqual({ x: 3, y: 3 })
  expect(outline.outline[2]).toEqual({ x: 3, y: 4 })
})

test("transformPCBElements moves pcb_courtyard_polygon points", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_courtyard_polygon",
      pcb_courtyard_polygon_id: "cp1",
      pcb_component_id: "pc1",
      layer: "top",
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 2 },
      ],
    } as any,
  ]

  transformPCBElements(elms, translate(1, 1))

  const polygon = elms[0] as any
  expect(polygon.points[0]).toEqual({ x: 1, y: 1 })
  expect(polygon.points[1]).toEqual({ x: 3, y: 1 })
  expect(polygon.points[2]).toEqual({ x: 3, y: 3 })
})

test("transformPCBElements moves pcb_note_line x1,y1,x2,y2", () => {
  const elms: AnyCircuitElement[] = [
    {
      type: "pcb_note_line",
      pcb_note_line_id: "nl1",
      x1: 0,
      y1: 0,
      x2: 5,
      y2: 5,
      layer: "top",
      stroke_width: 0.1,
    } as any,
  ]

  transformPCBElements(elms, translate(3, 4))

  const line = elms[0] as any
  expect(line.x1).toBe(3)
  expect(line.y1).toBe(4)
  expect(line.x2).toBe(8)
  expect(line.y2).toBe(9)
})

test("transformPCBElements rotates pcb_component insertion_direction for 90/180/270 degree transforms", () => {
  const cases = [
    { rotationDegrees: 90, expectedDirection: "from_front" },
    { rotationDegrees: 180, expectedDirection: "from_left" },
    { rotationDegrees: 270, expectedDirection: "from_back" },
  ] as const

  for (const { rotationDegrees, expectedDirection } of cases) {
    const elms: AnyCircuitElement[] = [
      createPcbComponent({ insertion_direction: "from_right" }),
    ]

    transformPCBElements(elms, compose(rotateDEG(rotationDegrees)))

    const component = elms[0] as PcbComponent
    expect(component).toBeDefined()
    if (component) expect(component.insertion_direction).toBe(expectedDirection)
  }
})

test("transformPCBElements mirrors pcb_component insertion_direction for flipped transforms", () => {
  const elms: AnyCircuitElement[] = [
    createPcbComponent({
      pcb_component_id: "pc-front",
      insertion_direction: "from_front",
    }),
    createPcbComponent({
      pcb_component_id: "pc-left",
      insertion_direction: "from_left",
    }),
  ]

  transformPCBElements(elms, compose(scale(1, -1)))

  expect((elms[0] as PcbComponent).insertion_direction).toBe("from_back")
  expect((elms[1] as PcbComponent).insertion_direction).toBe("from_left")
})

test("transformPCBElements applies rotation before Y-mirror for pcb_component insertion_direction", () => {
  const elms: AnyCircuitElement[] = [
    createPcbComponent({ insertion_direction: "from_left" }),
  ]

  transformPCBElements(elms, compose(scale(1, -1), rotateDEG(90)))

  expect((elms[0] as PcbComponent).insertion_direction).toBe("from_front")
})

test('transformPCBElements keeps pcb_component insertion_direction "from_above" unchanged', () => {
  const elms: AnyCircuitElement[] = [
    createPcbComponent({ insertion_direction: "from_above" }),
  ]

  transformPCBElements(elms, compose(scale(1, -1), rotateDEG(90)))

  expect((elms[0] as PcbComponent).insertion_direction).toBe("from_above")
})

test("transformPCBElements moves pcb_component cable_insertion_center", () => {
  const elms: AnyCircuitElement[] = [
    createPcbComponent({
      cable_insertion_center: { x: 3, y: 4 },
    }),
  ]

  transformPCBElements(elms, translate(5, 6))

  expect((elms[0] as PcbComponent).cable_insertion_center).toEqual({
    x: 8,
    y: 10,
  })
})
