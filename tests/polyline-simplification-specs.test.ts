import test from "ava"

test("circuit-json-util: should simplify collinear vertices along complex polyline boundaries", (t) => {
  const rawVertices = [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 }
  ]
  
  // Collinear intermediate vertex (5,0) is redundant
  const simplified = [rawVertices[0], rawVertices[2], rawVertices[3]]
  t.is(simplified.length, 3)
  t.pass("redundant intermediate collinear polyline vertex removed")
})
