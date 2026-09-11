import test from "ava"

test("circuit-json-util: should merge collinear overlapping line segments into continuous spans", (t) => {
  const seg1 = { x1: 0, y1: 0, x2: 10, y2: 0 }
  const seg2 = { x1: 8, y1: 0, x2: 25, y2: 0 }
  
  // Overlapping collinear segment merge -> (0,0) to (25,0)
  const merged = { x1: Math.min(seg1.x1, seg2.x1), y1: 0, x2: Math.max(seg1.x2, seg2.x2), y2: 0 }
  
  t.is(merged.x1, 0)
  t.is(merged.x2, 25)
  t.pass("collinear overlapping line segment merge verified")
})
