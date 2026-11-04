import { expect, test } from "bun:test"
import { pcb_board, pcb_trace, pcb_via } from "circuit-json"
import { normalizePcbTraceVias } from "../index"

test("legacy route vias materialize without guessing dimensions or duplicating physical vias", () => {
  const defaultViaDimensions = { holeDiameter: 0.4, outerDiameter: 0.9 }
  const trace = pcb_trace.parse({
    type: "pcb_trace",
    pcb_trace_id: "trace",
    subcircuit_id: "sub",
    route: [
      {
        route_type: "via",
        x: 5,
        y: -2,
        from_layer: "bottom",
        to_layer: "inner1",
        hole_diameter: 1,
        outer_diameter: 2,
        tented_on_top: true,
        tented_on_bottom: false,
      },
    ],
  })
  const board = pcb_board.parse({
    type: "pcb_board",
    pcb_board_id: "board",
    subcircuit_id: "sub",
    center: { x: 0, y: 0 },
    width: 20,
    height: 10,
    num_layers: 4,
    thickness: 1.6,
    material: "fr4",
    min_via_hole_diameter: 0.5,
    min_via_pad_diameter: 1.2,
  })
  const input = [board, trace]
  const original = structuredClone(input)
  const normalized = normalizePcbTraceVias({
    circuitJson: input,
    defaultViaDimensions,
  })
  const via = normalized.find((element) => element.type === "pcb_via")!
  expect(via).toMatchObject({
    x: 5,
    y: -2,
    hole_diameter: 1,
    outer_diameter: 2,
    layers: ["bottom", "inner2", "inner1"],
    pcb_trace_id: "trace",
    subcircuit_id: "sub",
    tented_on_top: true,
    tented_on_bottom: false,
  })
  expect(input).toEqual(original)
  expect(
    normalizePcbTraceVias({ circuitJson: normalized, defaultViaDimensions }),
  ).toEqual(normalized)
  const dimensionlessTrace = pcb_trace.parse({
    ...trace,
    route: [
      {
        ...trace.route[0],
        hole_diameter: undefined,
        outer_diameter: undefined,
      },
    ],
  })
  expect(
    normalizePcbTraceVias({
      circuitJson: [board, dimensionlessTrace],
      defaultViaDimensions,
    }).at(-1),
  ).toMatchObject({ hole_diameter: 0.5, outer_diameter: 1.2 })
  expect(
    normalizePcbTraceVias({
      circuitJson: [dimensionlessTrace],
      defaultViaDimensions,
    }).at(-1),
  ).toMatchObject({
    hole_diameter: 0.4,
    outer_diameter: 0.9,
    layers: ["bottom", "inner1"],
  })
  for (const pcb_trace_id of [undefined, "another-trace"]) {
    const suppliedVia = pcb_via.parse({ ...via, pcb_trace_id })
    const sharedTrace = { ...trace, pcb_trace_id: "shared-trace" }
    expect(
      normalizePcbTraceVias({
        circuitJson: [board, trace, sharedTrace, suppliedVia],
        defaultViaDimensions,
      }),
    ).toHaveLength(4)
  }
  const otherLayers = pcb_via.parse({ ...via, layers: ["top", "inner1"] })
  expect(
    normalizePcbTraceVias({
      circuitJson: [board, trace, otherLayers],
      defaultViaDimensions,
    }),
  ).toHaveLength(4)
  const otherBoard = pcb_board.parse({
    ...board,
    pcb_board_id: "other-board",
    subcircuit_id: "other-sub",
  })
  const otherBoardVia = pcb_via.parse({ ...via, subcircuit_id: "other-sub" })
  expect(
    normalizePcbTraceVias({
      circuitJson: [board, otherBoard, trace, otherBoardVia],
      defaultViaDimensions,
    }),
  ).toHaveLength(5)
  const collidingVia = pcb_via.parse({
    ...otherLayers,
    pcb_via_id: "trace_route_via_0",
  })
  const collision = normalizePcbTraceVias({
    circuitJson: [board, trace, collidingVia],
    defaultViaDimensions,
  })
  expect(collision.at(-1)).toMatchObject({ pcb_via_id: "trace_route_via_0_1" })
})
