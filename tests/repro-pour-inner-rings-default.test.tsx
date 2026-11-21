import { expect, test } from "bun:test"
import { Circuit } from "tscircuit"
import { getPourPolygon } from "../index"

test.failing("a BRep pour without inner rings is solid copper", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={12} height={10} routingDisabled>
      <net name="GND" />
      <copperpour
        layer="top"
        clearance={0}
        connectsTo="net.GND"
        outline={[
          { x: -4, y: -3 },
          { x: 4, y: -3 },
          { x: 4, y: 3 },
          { x: -4, y: 3 },
        ]}
      />
    </board>,
  )
  await circuit.renderUntilSettled()

  const [pour] = circuit.db.pcb_copper_pour.list()
  if (pour?.shape !== "brep") throw new Error("Expected a rendered BRep pour")
  const brepShape = { ...pour.brep_shape }
  Reflect.deleteProperty(brepShape, "inner_rings")

  const copper = getPourPolygon({ ...pour, brep_shape: brepShape })
  expect(copper.area()).toBeCloseTo(48)
  expect(copper.faces.size).toBe(1)
})
