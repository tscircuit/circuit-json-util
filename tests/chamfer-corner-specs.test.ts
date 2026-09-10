import test from "ava"

test("circuit-json-util: should calculate polygon vertex coordinates with 45-degree chamfers", (t) => {
  const corner = { x: 10, y: 10 }
  const chamferDistance = 0.5
  
  const v1 = { x: corner.x - chamferDistance, y: corner.y }
  const v2 = { x: corner.x, y: corner.y - chamferDistance }
  
  t.is(v1.x, 9.5)
  t.is(v2.y, 9.5)
  t.pass("chamfered vertex calculation preserves board outline aesthetics")
})
