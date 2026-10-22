import { expect, test } from "bun:test"
import type { PcbSmtPadPolygon, PcbSmtPadRect } from "circuit-json"
import { getSvgFromGraphicsObject } from "graphics-debug"
import { analyzePcbPin1Location } from "../lib/analyze-pcb-pin1-location"

type Point = { x: number; y: number }
type TestPad = PcbSmtPadRect | PcbSmtPadPolygon

const createRectPad = ({
  pinNumber,
  center,
  size,
}: {
  pinNumber: number
  center: Point
  size: { width: number; height: number }
}): PcbSmtPadRect => ({
  type: "pcb_smtpad",
  shape: "rect",
  pcb_smtpad_id: `led_pad_${pinNumber}`,
  x: center.x,
  y: center.y,
  width: size.width,
  height: size.height,
  layer: "top",
  port_hints: [`pin${pinNumber}`],
})

const createPolygonPad = ({
  pinNumber,
  points,
}: {
  pinNumber: number
  points: Point[]
}): PcbSmtPadPolygon => ({
  type: "pcb_smtpad",
  shape: "polygon",
  pcb_smtpad_id: `diode_pad_${pinNumber}`,
  points,
  layer: "top",
  port_hints: [`pin${pinNumber}`],
})

const customLedPads = [
  createRectPad({
    pinNumber: 1,
    center: { x: -0.799465, y: -0.003429 },
    size: { width: 0.7999984, height: 0.7999984 },
  }),
  createRectPad({
    pinNumber: 2,
    center: { x: 0.799465, y: 0.003429 },
    size: { width: 0.7999984, height: 0.7999984 },
  }),
]

const polygonDiodePads = [
  createPolygonPad({
    pinNumber: 1,
    points: [
      { x: -1.016, y: 0.2463038 },
      { x: -0.4064, y: 0.2463038 },
      { x: -0.4064, y: -0.2362962 },
      { x: -1.016, y: -0.2362962 },
    ],
  }),
  createPolygonPad({
    pinNumber: 2,
    points: [
      { x: 0.4064, y: 0.2362962 },
      { x: 1.016, y: 0.2362962 },
      { x: 1.016, y: -0.2463038 },
      { x: 0.4064, y: -0.2463038 },
    ],
  }),
]

const getPadCenter = (pad: TestPad): Point => {
  if (pad.shape === "rect") return { x: pad.x, y: pad.y }
  const xs = pad.points.map((point) => point.x)
  const ys = pad.points.map((point) => point.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

const getPadBounds = (pad: TestPad) => {
  if (pad.shape === "rect") {
    return {
      minX: pad.x - pad.width / 2,
      maxX: pad.x + pad.width / 2,
      minY: pad.y - pad.height / 2,
      maxY: pad.y + pad.height / 2,
    }
  }
  return {
    minX: Math.min(...pad.points.map((point) => point.x)),
    maxX: Math.max(...pad.points.map((point) => point.x)),
    minY: Math.min(...pad.points.map((point) => point.y)),
    maxY: Math.max(...pad.points.map((point) => point.y)),
  }
}

const formatMillimeters = (millimeters: number) =>
  millimeters.toFixed(7).replace(/0+$/, "").replace(/\.$/, "")

const renderPads = ({ label, pads }: { label: string; pads: TestPad[] }) => {
  const centers = pads.map(getPadCenter)
  const bounds = pads.map(getPadBounds)
  const minX = Math.min(...bounds.map((box) => box.minX))
  const maxX = Math.max(...bounds.map((box) => box.maxX))
  const minY = Math.min(...bounds.map((box) => box.minY))
  const maxY = Math.max(...bounds.map((box) => box.maxY))
  const width = maxX - minX
  const height = maxY - minY
  const centerlineY =
    centers.reduce((sum, center) => sum + center.y, 0) / centers.length
  const yDifference = Math.abs(centers[1]!.y - centers[0]!.y)
  const pin1Location = analyzePcbPin1Location(pads)
  const colors = [
    { fill: "#93c5fd", stroke: "#1d4ed8" },
    { fill: "#bbf7d0", stroke: "#166534" },
  ]

  return getSvgFromGraphicsObject({
    rects: pads.flatMap((pad, index) =>
      pad.shape === "rect"
        ? [
            {
              center: getPadCenter(pad),
              width: pad.width,
              height: pad.height,
              ...colors[index]!,
              label: `pin ${index + 1}`,
            },
          ]
        : [],
    ),
    polygons: pads.flatMap((pad, index) =>
      pad.shape === "polygon"
        ? [
            {
              points: pad.points,
              ...colors[index]!,
              label: `pin ${index + 1}`,
            },
          ]
        : [],
    ),
    lines: [
      {
        points: [
          { x: minX - width * 0.1, y: centerlineY },
          { x: maxX + width * 0.1, y: centerlineY },
        ],
        strokeColor: "#dc2626",
        label: "expected centerline",
      },
      {
        points: centers,
        strokeColor: "#7c3aed",
        label: "pad centers",
      },
    ],
    texts: [
      {
        x: (minX + maxX) / 2,
        y: maxY + height * 0.25,
        text: `${label}: ${formatMillimeters(yDifference)} mm Y difference; ${pin1Location}`,
        color: "#111827",
        fontSize: Math.max(width, height) * 0.02,
      },
    ],
  }).replace(/[ \t]+$/gm, "")
}

test("shows the imported two-pad footprint skew", () => {
  expect(renderPads({ label: "LED", pads: customLedPads })).toMatchSvgSnapshot(
    import.meta.path,
    "led",
  )
  expect(
    renderPads({ label: "Diode", pads: polygonDiodePads }),
  ).toMatchSvgSnapshot(import.meta.path, "diode")
})

test("infers the LED pin 1 side despite imported coordinate skew", () => {
  expect(analyzePcbPin1Location(customLedPads)).toBe("topside_left")
})

test("infers the diode pin 1 side despite imported coordinate skew", () => {
  expect(analyzePcbPin1Location(polygonDiodePads)).toBe("topside_left")
})
