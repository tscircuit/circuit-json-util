import test from "ava"

test("rotates silkscreen text coordinates around anchor origin by arbitrary angles", (t) => {
  const point = { x: 10, y: 0 }
  const angleDeg = 90
  const angleRad = (angleDeg * Math.PI) / 180
  
  const rotatedX = Math.round(point.x * Math.cos(angleRad) - point.y * Math.sin(angleRad))
  const rotatedY = Math.round(point.x * Math.sin(angleRad) + point.y * Math.cos(angleRad))
  
  t.is(rotatedX, 0)
  t.is(rotatedY, 10)
})
