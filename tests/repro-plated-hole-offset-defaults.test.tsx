import { expect, test } from "bun:test"
import { Circuit } from "tscircuit"
import { getPlatedHolePolygon } from "../index"

test("plated holes without offsets have finite copper bounds", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={18} height={6} routingDisabled>
      <platedhole
        shape="circular_hole_with_rect_pad"
        pcbX={-6}
        holeDiameter={0.8}
        rectPadWidth={3}
        rectPadHeight={2}
      />
      <platedhole
        shape="pill_hole_with_rect_pad"
        pcbX={-2}
        holeWidth={1.6}
        holeHeight={0.8}
        rectPadWidth={3}
        rectPadHeight={2}
      />
      <platedhole
        shape="pill_hole_with_rect_pad"
        pcbX={2}
        pcbRotation={30}
        holeWidth={1.6}
        holeHeight={0.8}
        rectPadWidth={3}
        rectPadHeight={2}
      />
      <platedhole
        shape="hole_with_polygon_pad"
        pcbX={6}
        holeShape="circle"
        holeDiameter={0.8}
        holeOffsetX={0}
        holeOffsetY={0}
        padOutline={[
          { x: -1.5, y: -1 },
          { x: 1.5, y: -1 },
          { x: 0.8, y: 1 },
          { x: -0.8, y: 1 },
        ]}
      />
    </board>,
  )
  await circuit.renderUntilSettled()

  const pads = circuit.db.pcb_plated_hole.list()
  const polygons = pads.map((pad) => {
    // The polygon primitive requires offsets in TSX. Omit the fields from each
    // rendered record to exercise the circuit-json defaults at the API boundary.
    const unparsed = { ...pad }
    Reflect.deleteProperty(unparsed, "hole_offset_x")
    Reflect.deleteProperty(unparsed, "hole_offset_y")
    return getPlatedHolePolygon(unparsed)
  })
  expect(
    pads.map((pad, i) => {
      const { xmin, ymin, xmax, ymax } = polygons[i]!.box
      return {
        shape: pad.shape,
        finite: [xmin, ymin, xmax, ymax].every(Number.isFinite),
      }
    }),
  ).toEqual([
    { shape: "circular_hole_with_rect_pad", finite: true },
    { shape: "pill_hole_with_rect_pad", finite: true },
    { shape: "rotated_pill_hole_with_rect_pad", finite: true },
    { shape: "hole_with_polygon_pad", finite: true },
  ])

  const copper = polygons.map((polygon) =>
    polygon.svg({ fill: "#b46a30", stroke: "none" }),
  )
  const bounds = polygons.map((polygon) =>
    polygon.box.svg({ fill: "none", stroke: "#f6d365", strokeWidth: 0.04 }),
  )
  await expect(
    `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="240" viewBox="-9 -3 18 6">
      <rect x="-9" y="-3" width="18" height="6" fill="#182820"/>
      <g transform="scale(1 -1)">${copper.join("")}${bounds.join("")}</g>
    </svg>`,
  ).toMatchSvgSnapshot(import.meta.path)
})
