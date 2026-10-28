import { expect, test } from "bun:test"
import { isRouteViaCoveredByPhysicalVia } from "../lib/is-route-via-covered-by-physical-via"

const via = {
  x: 1,
  y: 2,
  layers: ["top", "inner1", "inner2", "bottom"],
  outer_diameter: 0.6,
  hole_diameter: 0.3,
}
const routeVia = { x: 1, y: 2, from_layer: "top", to_layer: "inner1" }

test("a physical via covers a partial route transition in either direction", () => {
  expect(isRouteViaCoveredByPhysicalVia(via, routeVia)).toBe(true)
  expect(
    isRouteViaCoveredByPhysicalVia(
      { ...via, layers: ["bottom", "top"] },
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
    isRouteViaCoveredByPhysicalVia(via, { ...routeVia, ...difference }),
  ).toBe(false)
})

test("coverage requires the route to stay within a known physical span", () => {
  const blindVia = { ...via, layers: ["top", "inner1"] }
  expect(isRouteViaCoveredByPhysicalVia(blindVia, routeVia)).toBe(true)
  expect(
    isRouteViaCoveredByPhysicalVia(blindVia, {
      ...routeVia,
      to_layer: "inner2",
    }),
  ).toBe(false)
  expect(isRouteViaCoveredByPhysicalVia({ ...via, layers: [] }, routeVia)).toBe(
    false,
  )
  expect(
    isRouteViaCoveredByPhysicalVia(via, { ...routeVia, to_layer: "unknown" }),
  ).toBe(false)
})

test("position tolerance is opt-in", () => {
  const nearbyRoute = { ...routeVia, y: 2 + Number.EPSILON * 2 }

  expect(isRouteViaCoveredByPhysicalVia(via, nearbyRoute)).toBe(false)
  expect(
    isRouteViaCoveredByPhysicalVia(via, nearbyRoute, {
      positionTolerance: 1e-6,
    }),
  ).toBe(true)
})

test.each([
  ["positive tolerance boundary", { x: 1e-6 }, true],
  ["negative tolerance boundary", { y: -1e-6 }, true],
  ["outside x tolerance", { x: 1.5e-6 }, false],
  ["outside y tolerance", { y: -1.5e-6 }, false],
  ["different outer diameter", { x: 1e-10, outer_diameter: 0.8 }, false],
  ["different hole diameter", { x: 1e-10, hole_diameter: 0.4 }, false],
  ["outside physical span", { x: 1e-10, to_layer: "inner3" }, false],
] as const)("position tolerance respects %s", (_, difference, covered) => {
  expect(
    isRouteViaCoveredByPhysicalVia(
      { ...via, x: 0, y: 0, layers: ["top", "inner1", "inner2"] },
      { ...routeVia, x: 0, y: 0, ...difference },
      { positionTolerance: 1e-6 },
    ),
  ).toBe(covered)
})
