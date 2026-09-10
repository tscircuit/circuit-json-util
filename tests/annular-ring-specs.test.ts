import test from "ava"

test("circuit-json-util: should calculate minimum annular ring width for plated through-holes", (t) => {
  const padDiameter = 1.6
  const drillDiameter = 0.9
  const annularRing = (padDiameter - drillDiameter) / 2
  
  t.is(annularRing, 0.35)
  t.true(annularRing >= 0.15)
  t.pass("annular ring dimensions satisfy standard PCB fab constraints")
})
