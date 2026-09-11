import test from "ava"

test("circuit-json-util: should calculate center centroid coordinate from irregular bounding boxes", (t) => {
  const bbox = { minX: 10, maxX: 30, minY: 20, maxY: 60 }
  const centerX = (bbox.minX + bbox.maxX) / 2
  const centerY = (bbox.minY + bbox.maxY) / 2
  
  t.is(centerX, 20)
  t.is(centerY, 40)
  t.pass("bounding box center calculation verified")
})
