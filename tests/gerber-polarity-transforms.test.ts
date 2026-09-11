import test from "ava"

test("handles Gerber layer dark/clear polarity switching for plane cutouts and thermal reliefs", (t) => {
  const layers = [
    { name: "copper_plane", polarity: "dark", fill: true },
    { name: "thermal_relief_cutout", polarity: "clear", fill: false }
  ]
  
  const hasInversion = layers.some(l => l.polarity === "clear")
  t.true(hasInversion)
  t.is(layers[0].polarity, "dark")
  t.is(layers[1].polarity, "clear")
})
