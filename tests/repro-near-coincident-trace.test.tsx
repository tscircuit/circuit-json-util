import { Point } from "@flatten-js/core"
import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { applyToPoint, scale } from "transformation-matrix"
import { getTraceSegmentPolygon } from "../lib/copper-geometry"

test("near-coincident trace endpoints during copper containment", async () => {
  const start = { x: 12, y: 5.77 }
  const end = { x: 12, y: 5.7700000000000005 }
  const traceWidth = 0.2
  const cleanupGeometryScale = 1e6
  const circuit = new Circuit()
  circuit.add(
    <board width={32} height={24}>
      <chip
        name="U1"
        pcbX={0}
        pcbY={0}
        footprint={
          <footprint>
            <smtpad shape="circle" radius={0.3} portHints={["pin1"]} />
          </footprint>
        }
      />
      <chip
        name="U2"
        pcbX={14}
        pcbY={5.77}
        footprint={
          <footprint>
            <smtpad shape="circle" radius={0.3} portHints={["pin1"]} />
          </footprint>
        }
      />
      <trace
        from="U1.pin1"
        to="U2.pin1"
        thickness={traceWidth}
        pcbPath={[start, end]}
      />
      <pcbnotetext
        text="NEAR-COINCIDENT TRACE / COPPER CLEANUP"
        pcbY={10}
        fontSize={0.65}
      />
      <pcbnotetext text="A/B" pcbX={12} pcbY={7} fontSize={0.65} />
      <pcbnotetext
        text="At x=12: y=5.77 to 5.7700000000000005 mm"
        pcbY={-2}
        fontSize={0.65}
      />
      <pcbnotetext
        text="Segment length: 8.88e-16 mm; width: 0.2 mm"
        pcbY={-4}
        fontSize={0.65}
      />
      <pcbnotetext
        text="Core scales copper by 1e6 before containment"
        pcbY={-6}
        fontSize={0.65}
      />
      <pcbnotetext
        text="Expected: center is inside the round end cap"
        pcbY={-8}
        fontSize={0.65}
      />
      <pcbnotetext
        text="Actual: Zero division; copper cleanup aborts"
        pcbY={-10}
        fontSize={0.65}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const trace = circuitJson.find((element) => element.type === "pcb_trace")!
  expect(trace.route.slice(1, 3)).toEqual([
    { ...start, route_type: "wire", layer: "top", width: traceWidth },
    { ...end, route_type: "wire", layer: "top", width: traceWidth },
  ])
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  expect(length).toBeGreaterThan(0)
  expect(length).toBe(8.881784197001252e-16)

  const polygon = getTraceSegmentPolygon(start, end, traceWidth).scale(
    cleanupGeometryScale,
    cleanupGeometryScale,
  )
  const queryPoint = applyToPoint(scale(cleanupGeometryScale), start)
  expect(() => polygon.contains(new Point(queryPoint.x, queryPoint.y))).toThrow(
    "Zero division",
  )
  expect(
    convertCircuitJsonToPcbSvg(circuitJson, {
      showPcbNotes: true,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
