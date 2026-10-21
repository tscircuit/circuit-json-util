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
