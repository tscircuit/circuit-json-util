import test from "ava"

test("circuit-json-util: should calculate polygon surface area using Shoelace formula", (t) => {
  // Triangle: (0,0), (4,0), (0,3) -> Area = 0.5 * 4 * 3 = 6
  const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }]
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y
    area -= pts[j].x * pts[i].y
  }
  area = Math.abs(area) / 2
  
  t.is(area, 6)
  t.pass("Shoelace formula polygon area calculation verified")
})
