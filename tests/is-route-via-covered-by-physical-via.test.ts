import { expect, test } from "bun:test"
import { isRouteViaCoveredByPhysicalVia } from "../lib/is-route-via-covered-by-physical-via"

const viaWithLayers = {
  x: 1,
  y: 2,
  layers: ["top", "inner1", "inner2", "bottom"],
  outer_diameter: 0.6,
  hole_diameter: 0.3,
}
const routeVia = { x: 1, y: 2, from_layer: "top", to_layer: "inner1" }

test("a via with layers covers a partial route transition in either direction", () => {
  expect(isRouteViaCoveredByPhysicalVia(viaWithLayers, routeVia)).toBe(true)
  expect(
    isRouteViaCoveredByPhysicalVia(
      { ...viaWithLayers, layers: ["bottom", "top"] },
      { ...routeVia, from_layer: "inner1", to_layer: "top" },
    ),
  ).toBe(true)
})

test.each([
  { x: 2 },
  { y: 3 },
  { outer_diameter: 0.8 },
  { hole_diameter: 0.4 },
])("a route with different geometry is not covered: %j", (difference) => {
  expect(
    isRouteViaCoveredByPhysicalVia(viaWithLayers, {
      ...routeVia,
      ...difference,
    }),
  ).toBe(false)
})

test("coverage requires the route to stay within a known via layer span", () => {
  const blindVia = { ...viaWithLayers, layers: ["top", "inner1"] }
  expect(isRouteViaCoveredByPhysicalVia(blindVia, routeVia)).toBe(true)
  expect(
    isRouteViaCoveredByPhysicalVia(blindVia, {
      ...routeVia,
      to_layer: "inner2",
    }),
  ).toBe(false)
  expect(
    isRouteViaCoveredByPhysicalVia({ ...viaWithLayers, layers: [] }, routeVia),
  ).toBe(false)
  expect(
    isRouteViaCoveredByPhysicalVia(viaWithLayers, {
      ...routeVia,
      to_layer: "unknown",
    }),
  ).toBe(false)
})

test("position tolerance is opt-in", () => {
  const nearbyRoute = { ...routeVia, y: 2 + Number.EPSILON * 2 }

  expect(isRouteViaCoveredByPhysicalVia(viaWithLayers, nearbyRoute)).toBe(false)
  expect(
    isRouteViaCoveredByPhysicalVia({
      viaWithLayers,
      routeVia: nearbyRoute,
      positionTolerance: 1e-6,
    }),
  ).toBe(true)
})

test("named options preserve exact matching by default", () => {
  const nearbyRoute = { ...routeVia, y: 2 + Number.EPSILON * 2 }

  expect(isRouteViaCoveredByPhysicalVia({ viaWithLayers, routeVia })).toBe(true)
  expect(
    isRouteViaCoveredByPhysicalVia({
      viaWithLayers,
      routeVia: nearbyRoute,
    }),
  ).toBe(false)
  expect(
    isRouteViaCoveredByPhysicalVia({
      viaWithLayers,
      routeVia: nearbyRoute,
      positionTolerance: 0,
    }),
  ).toBe(false)
})

test.each([
  {
    scenario: "positive tolerance boundary",
    routeDifference: { x: 1e-6 },
    expectedCoverage: true,
  },
  {
    scenario: "negative tolerance boundary",
    routeDifference: { y: -1e-6 },
    expectedCoverage: true,
  },
  {
    scenario: "diagonal tolerance boundary",
    routeDifference: { x: 1e-6, y: -1e-6 },
    expectedCoverage: true,
  },
  {
    scenario: "outside x tolerance",
    routeDifference: { x: 1.5e-6 },
    expectedCoverage: false,
  },
  {
    scenario: "outside y tolerance",
    routeDifference: { y: -1.5e-6 },
    expectedCoverage: false,
  },
  {
    scenario: "different outer diameter",
    routeDifference: { x: 1e-10, outer_diameter: 0.8 },
    expectedCoverage: false,
  },
  {
    scenario: "different hole diameter",
    routeDifference: { x: 1e-10, hole_diameter: 0.4 },
    expectedCoverage: false,
  },
  {
    scenario: "outside via layer span",
    routeDifference: { x: 1e-10, to_layer: "inner3" },
    expectedCoverage: false,
  },
])(
  "position tolerance respects $scenario",
  ({ routeDifference, expectedCoverage }) => {
    expect(
      isRouteViaCoveredByPhysicalVia({
        viaWithLayers: {
          ...viaWithLayers,
          x: 0,
          y: 0,
          layers: ["top", "inner1", "inner2"],
        },
        routeVia: { ...routeVia, x: 0, y: 0, ...routeDifference },
        positionTolerance: 1e-6,
      }),
    ).toBe(expectedCoverage)
  },
)

test("tolerant coverage accepts frozen vias without changing their positions", () => {
  const frozenViaWithLayers = Object.freeze({
    ...viaWithLayers,
    layers: Object.freeze([...viaWithLayers.layers]),
  })
  const nearbyRoute = Object.freeze({
    ...routeVia,
    y: 2 + Number.EPSILON * 2,
  })

  expect(
    isRouteViaCoveredByPhysicalVia({
      viaWithLayers: frozenViaWithLayers,
      routeVia: nearbyRoute,
      positionTolerance: 1e-6,
    }),
  ).toBe(true)
  expect(frozenViaWithLayers.y).toBe(2)
  expect(nearbyRoute.y).toBe(2 + Number.EPSILON * 2)
})
