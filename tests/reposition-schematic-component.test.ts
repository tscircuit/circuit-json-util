import type { AnyCircuitElement } from "circuit-json"
import { repositionSchematicComponentTo } from "../lib/reposition-schematic-component"
import { test, expect } from "bun:test"

const makeSoup = (): AnyCircuitElement[] => [
  {
    type: "schematic_component",
    schematic_component_id: "sc1",
    source_component_id: "src1",
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
  } as any,
  {
    type: "schematic_port",
    schematic_port_id: "sp1",
    schematic_component_id: "sc1",
    center: { x: 0, y: 0 },
  } as any,
  {
    type: "schematic_text",
    schematic_text_id: "st1",
    position: { x: 0, y: 0 },
    text: "label",
    schematic_component_id: "sc1",
  } as any,
  {
    type: "schematic_trace",
    schematic_trace_id: "t1",
    route: [
      {
        x: 0,
        y: 0,
        route_type: "wire",
        start_schematic_port_id: "sp1",
      },
      { x: 5, y: 0, route_type: "wire" },
    ],
  } as any,
]

test("repositionSchematicComponentTo moves component and related elements", () => {
  const soup = makeSoup()

  repositionSchematicComponentTo(soup, "sc1", { x: 10, y: 5 })

  const comp = soup.find((e) => e.type === "schematic_component") as any
  const port = soup.find((e) => e.type === "schematic_port") as any
  const text = soup.find((e) => e.type === "schematic_text") as any
  const trace = soup.find((e) => e.type === "schematic_trace") as any

  expect(comp.center).toEqual({ x: 10, y: 5 })
  expect(port.center.x).toBe(10)
  expect(port.center.y).toBe(5)
  expect(text.position.x).toBe(10)
  expect(text.position.y).toBe(5)
  expect(trace.route[0].x).toBe(10)
  expect(trace.route[0].y).toBe(5)
  expect(trace.route[1].x).toBe(15)
  expect(trace.route[1].y).toBe(5)
})
