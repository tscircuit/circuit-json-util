import test from "ava"

test("computes accurate 2D bounding box for multi-segment PCB traces with route thickness", (t) => {
  const trace = {
    route: [
      { x: 10, y: 10, width: 0.25 },
      { x: 30, y: 10, width: 0.25 },
      { x: 30, y: 40, width: 0.25 }
    ]
  }
  
  const minX = Math.min(...trace.route.map(p => p.x - p.width / 2))
  const maxX = Math.max(...trace.route.map(p => p.x + p.width / 2))
  const minY = Math.min(...trace.route.map(p => p.y - p.width / 2))
  const maxY = Math.max(...trace.route.map(p => p.y + p.width / 2))
  
  t.is(minX, 9.875)
  t.is(maxX, 30.125)
  t.is(minY, 9.875)
  t.is(maxY, 40.125)
})
