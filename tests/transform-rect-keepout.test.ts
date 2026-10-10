import { expect, test } from "bun:test"
import type {
  AnyCircuitElement,
  PCBKeepoutCircle,
  PCBKeepoutRect,
  PcbComponent,
  PcbKeepoutOutline,
} from "circuit-json"
import { getSvgFromGraphicsObject } from "graphics-debug"
import { compose, rotateDEG, scale, translate } from "transformation-matrix"
import {
  repositionPcbComponentTo,
  transformPCBElement,
  transformPCBElements,
} from "../index"

const createKeepout = (): PCBKeepoutRect => ({
  type: "pcb_keepout",
  pcb_keepout_id: "rect_keepout",
  shape: "rect",
  layers: ["top", "bottom"],
  center: { x: 2, y: 1 },
  width: 2,
  height: 6,
  allow_placements: true,
  allow_traces: false,
})

// graphics-debug embeds script lines with trailing spaces. Normalize those in
// the generated output so snapshots remain clean under git diff --check.
const renderSnapshot = (
  graphics: Parameters<typeof getSvgFromGraphicsObject>[0],
) => getSvgFromGraphicsObject(graphics).replace(/[ \t]+$/gm, "")

const renderComparison = (
  keepout: PCBKeepoutRect,
  expectedCenter: { x: number; y: number },
  rotation: number,
) =>
  renderSnapshot({
    rects: [
      {
        ...keepout,
        stroke: "#dc2626",
        fill: "#fee2e2",
        label: "emitted keepout bounds",
      },
      {
        center: expectedCenter,
        width: 2,
        height: 6,
        ccwRotationDegrees: rotation,
        stroke: "#1d4ed8",
        fill: "#93c5fd",
        label: "rotated original keepout",
      },
    ],
    texts: [
      {
        x: expectedCenter.x,
        y: expectedCenter.y + keepout.height / 2 + 1,
        text: `Emitted bounds: ${keepout.width.toFixed(3)} x ${keepout.height.toFixed(3)} mm`,
        color: "#dc2626",
        fontSize: 0.22,
      },
      {
        x: expectedCenter.x,
        y: expectedCenter.y + keepout.height / 2 + 0.5,
        text: `Original keepout rotated ${rotation} degrees`,
        color: "#1d4ed8",
        fontSize: 0.22,
      },
    ],
  })

test("nonsquare rect keepouts have exact quarter-turn bounds with either reflection", () => {
  // Board-world mm, +X right/+Y top. Reflection negates X before rotation;
  // reference centers below are independently measured from (2,1).
  const cases = [
    { rotation: 0, reflected: false, center: { x: 12, y: -6 } },
    { rotation: 90, reflected: false, center: { x: 9, y: -5 } },
    { rotation: 180, reflected: false, center: { x: 8, y: -8 } },
    { rotation: 270, reflected: false, center: { x: 11, y: -9 } },
    { rotation: 0, reflected: true, center: { x: 8, y: -6 } },
    { rotation: 90, reflected: true, center: { x: 9, y: -9 } },
    { rotation: 180, reflected: true, center: { x: 12, y: -8 } },
    { rotation: 270, reflected: true, center: { x: 11, y: -5 } },
  ]
  for (const { rotation, reflected, center } of cases) {
    const keepout = createKeepout()
    const result = transformPCBElement(
      keepout,
      compose(
        translate(10, -7),
        rotateDEG(rotation),
        scale(reflected ? -1 : 1, 1),
      ),
    )
    expect(result).toBe(keepout)
    expect(keepout.center.x).toBeCloseTo(center.x, 9)
    expect(keepout.center.y).toBeCloseTo(center.y, 9)
    expect(keepout.width).toBeCloseTo(rotation % 180 === 0 ? 2 : 6, 9)
    expect(keepout.height).toBeCloseTo(rotation % 180 === 0 ? 6 : 2, 9)
    expect(keepout.layers).toEqual(["top", "bottom"])
    expect(keepout.allow_placements).toBe(true)
    expect(keepout.allow_traces).toBe(false)
    expect(renderComparison(keepout, center, rotation)).toMatchSvgSnapshot(
      import.meta.path,
      `${rotation}-${reflected ? "reflected" : "unreflected"}`,
    )
  }
})

test("arbitrary-angle rect bounds conservatively contain the rotated original", () => {
  const cases = [
    {
      rotation: 45,
      center: { x: 10 + Math.SQRT1_2, y: -7 + 3 * Math.SQRT1_2 },
      width: 4 * Math.SQRT2,
      height: 4 * Math.SQRT2,
    },
    {
      rotation: 30,
      center: { x: 10 + Math.sqrt(3) - 0.5, y: -6 + Math.sqrt(3) / 2 },
      width: 3 + Math.sqrt(3),
      height: 1 + 3 * Math.sqrt(3),
    },
  ]
  for (const { rotation, center, width, height } of cases) {
    const keepout = createKeepout()
    // Exercise the plural API too: rect dimensions must not be swapped again
    // by its existing SMT/paste-only quarter-turn handling.
    transformPCBElements(
      [keepout],
      compose(translate(10, -7), rotateDEG(rotation)),
    )
    expect(keepout.shape).toBe("rect")
    expect(keepout.center.x).toBeCloseTo(center.x, 9)
    expect(keepout.center.y).toBeCloseTo(center.y, 9)
    expect(keepout.width).toBeCloseTo(width, 9)
    expect(keepout.height).toBeCloseTo(height, 9)
    expect(renderComparison(keepout, center, rotation)).toMatchSvgSnapshot(
      import.meta.path,
      `${rotation}-conservative-bounds`,
    )
  }
})

test("repositioning a rotated owned keepout preserves unrelated and unowned geometry", () => {
  const component: PcbComponent = {
    type: "pcb_component",
    pcb_component_id: "owner",
    source_component_id: "source_owner",
    layer: "top",
    center: { x: 0, y: 0 },
    width: 8,
    height: 5,
    rotation: 0,
    obstructs_within_bounds: true,
  }
  // Ownership is already recognized by repositionPcbComponentTo. Attach it
  // directly so this utility test does not depend on a newer schema parser.
  const owned = {
    ...createKeepout(),
    pcb_component_id: component.pcb_component_id,
  }
  const circle: PCBKeepoutCircle & { pcb_component_id: string } = {
    type: "pcb_keepout",
    pcb_keepout_id: "owned_circle",
    pcb_component_id: component.pcb_component_id,
    shape: "circle",
    layers: ["top"],
    center: { x: -2, y: 1 },
    radius: 0.75,
  }
  const outline: PcbKeepoutOutline & { pcb_component_id: string } = {
    type: "pcb_keepout",
    pcb_keepout_id: "owned_outline",
    pcb_component_id: component.pcb_component_id,
    shape: "outline",
    layers: ["bottom"],
    outline: [
      { x: -2, y: -2 },
      { x: 1, y: -2 },
      { x: -1, y: -1 },
    ],
    stroke_width: 0.1,
  }
  const unrelated = {
    ...createKeepout(),
    pcb_keepout_id: "unrelated",
    pcb_component_id: "other_owner",
    center: { x: -5, y: -3 },
    width: 1,
    height: 3,
  }
  const unowned = {
    ...createKeepout(),
    pcb_keepout_id: "unowned",
    center: { x: -2, y: 5 },
    width: 4,
    height: 1,
    excluded_pcb_component_ids: [component.pcb_component_id],
  }
  const controlsBefore = structuredClone([unrelated, unowned])
  transformPCBElements([component, owned, circle, outline], rotateDEG(90))
  const circuitJson: AnyCircuitElement[] = [
    component,
    owned,
    circle,
    outline,
    unrelated,
    unowned,
  ]
  repositionPcbComponentTo(circuitJson, component.pcb_component_id, {
    x: 4,
    y: -3,
  })
  expect(component.center).toEqual({ x: 4, y: -3 })
  expect(owned.center.x).toBeCloseTo(3, 9)
  expect(owned.center.y).toBeCloseTo(-1, 9)
  expect(owned.width).toBeCloseTo(6, 9)
  expect(owned.height).toBeCloseTo(2, 9)
  expect(circle.center.x).toBeCloseTo(3, 9)
  expect(circle.center.y).toBeCloseTo(-5, 9)
  expect(circle.radius).toBe(0.75)
  expect(circle.layers).toEqual(["top"])
  for (const [index, expected] of [
    { x: 6, y: -5 },
    { x: 6, y: -2 },
    { x: 5, y: -4 },
  ].entries()) {
    expect(outline.outline[index]!.x).toBeCloseTo(expected.x, 9)
    expect(outline.outline[index]!.y).toBeCloseTo(expected.y, 9)
  }
  expect(outline.stroke_width).toBe(0.1)
  expect(outline.layers).toEqual(["bottom"])
  expect([unrelated, unowned]).toEqual(controlsBefore)
  expect(
    renderSnapshot({
      rects: [
        {
          ...owned,
          fill: "#fee2e2",
          stroke: "#dc2626",
          label: "owned: rotated and moved",
        },
        {
          ...unrelated,
          fill: "#93c5fd",
          stroke: "#1d4ed8",
          label: "other owner: unchanged",
        },
        {
          ...unowned,
          fill: "#bbf7d0",
          stroke: "#166534",
          label: "unowned DRC exclusion: unchanged",
        },
      ],
      circles: [
        { center: circle.center, radius: circle.radius, fill: "#c4b5fd" },
      ],
      polygons: [
        {
          points: outline.outline,
          fill: "#fdba74",
          stroke: "#c2410c",
          label: "owned outline: rotated and moved",
        },
      ],
      texts: [
        {
          x: 3,
          y: 0.5,
          text: "Owned rect: rotated and moved",
          color: "#dc2626",
          fontSize: 0.22,
        },
        {
          x: -5,
          y: -1,
          text: "Other owner: fixed",
          color: "#1d4ed8",
          fontSize: 0.22,
        },
        {
          x: -2,
          y: 6,
          text: "Unowned exclusion: fixed",
          color: "#166534",
          fontSize: 0.22,
        },
        {
          x: 3,
          y: -6.2,
          text: "Owned circle: moved",
          color: "#7c3aed",
          fontSize: 0.22,
        },
        {
          x: 6,
          y: -5.5,
          text: "Owned outline: moved",
          color: "#c2410c",
          fontSize: 0.22,
        },
      ],
    }),
  ).toMatchSvgSnapshot(import.meta.path, "owned-reposition-controls")
})
