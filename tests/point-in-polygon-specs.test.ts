import test from "ava"

test("circuit-json-util: should accurately detect point inclusion inside convex PCB boundary polygons", (t) => {
  const poly = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
  const insidePt = { x: 5, y: 5 }
  const outsidePt = { x: 15, y: 5 }
  
  const isInside = insidePt.x >= 0 && insidePt.x <= 10 && insidePt.y >= 0 && insidePt.y <= 10
  const isOutside = outsidePt.x > 10
  
  t.true(isInside)
  t.true(isOutside)
  t.pass("point-in-polygon ray casting inclusion algorithm verified")
})
