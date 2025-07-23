import type { AnyCircuitElement } from "circuit-json"
import { repositionPcbComponentTo } from "../lib/reposition-pcb-component"
import { test, expect } from "bun:test"

const makeSoup = (): AnyCircuitElement[] => [
  {
    type: "pcb_component",
    pcb_component_id: "pc1",
    source_component_id: "sc1",
    center: { x: 0, y: 0 },
    layer: "top",
    rotation: 0,
    width: 2,
    height: 2,
  } as any,
  {
    type: "pcb_port",
    pcb_port_id: "pp1",
    pcb_component_id: "pc1",
    source_port_id: "sp1",
    x: 0,
    y: 0,
    layers: ["top"],
  } as any,
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    pcb_port_id: "pp1",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    layer: "top",
    shape: "rect",
  } as any,
  {
    type: "pcb_trace",
    pcb_trace_id: "t1",
    route: [
      {
        x: 0,
        y: 0,
        width: 1,
        layer: "top",
        route_type: "wire",
        start_pcb_port_id: "pp1",
      },
      { x: 5, y: 0, width: 1, layer: "top", route_type: "wire" },
    ],
  } as any,
]

test("repositionPcbComponentTo moves component and children", () => {
  const soup = makeSoup()

  repositionPcbComponentTo(soup, "pc1", { x: 10, y: 5 })

  const comp = soup.find((e) => e.type === "pcb_component") as any
  const port = soup.find((e) => e.type === "pcb_port") as any
  const pad = soup.find((e) => e.type === "pcb_smtpad") as any
  const trace = soup.find((e) => e.type === "pcb_trace") as any

  expect(comp.center).toEqual({ x: 10, y: 5 })
  expect(port.x).toBe(10)
  expect(port.y).toBe(5)
  expect(pad.x).toBe(10)
  expect(pad.y).toBe(5)
  expect(trace.route[0].x).toBe(10)
  expect(trace.route[0].y).toBe(5)
  expect(trace.route[1].x).toBe(15)
  expect(trace.route[1].y).toBe(5)
})
