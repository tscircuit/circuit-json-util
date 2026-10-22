import { expect, test } from "bun:test"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { RootCircuit } from "tscircuit"
import { compose, rotateDEG, translate } from "transformation-matrix"
import { transformSchematicElements } from "../index"

test("reproduce detached TVS artwork after transforming a real TSX circuit", async () => {
  const circuit = new RootCircuit()
  circuit.pcbDisabled = true
  circuit.add(
    <board schAutoLayoutEnabled>
      <net name="POGO5" isPowerNet />
      <net name="GND" isGroundNet />
      <schematicsection name="charger" />
      <diode
        name="D2"
        schSectionName="charger"
        schOrientation="horizontal"
        pinLabels={{ pin1: ["pin1"], pin2: ["pin2"] }}
        connections={{ pin1: "net.POGO5", pin2: "net.GND" }}
        symbol={
          <symbol>
            <port
              name="pin1"
              pinNumber={1}
              direction="left"
              schX={-0.5}
              schY={0}
              schStemLength={0.2}
            />
            <port
              name="pin2"
              pinNumber={2}
              direction="right"
              schX={0.5}
              schY={0}
              schStemLength={0.2}
            />
            <schematicpath
              points={[
                { x: 0.1, y: 0.1 },
                { x: 0.3, y: 0 },
                { x: 0.1, y: -0.1 },
                { x: 0.1, y: 0.1 },
              ]}
            />
            <schematicpath
              points={[
                { x: -0.1, y: 0.1 },
                { x: -0.3, y: 0 },
                { x: -0.1, y: -0.1 },
                { x: -0.1, y: 0.1 },
              ]}
            />
            <schematicpath
              points={[
                { x: -0.3, y: -0.1 },
                { x: -0.3, y: 0.1 },
                { x: -0.24, y: 0.1 },
              ]}
            />
            <schematicpath
              points={[
                { x: 0.3, y: 0.1 },
                { x: 0.3, y: -0.1 },
                { x: 0.24, y: -0.1 },
              ]}
            />
            <schematicpath
              points={[
                { x: -0.1, y: 0 },
                { x: 0.1, y: 0 },
              ]}
            />
            <schematictext schX={0} schY={0.3} text="D2" fontSize={0.2} />
          </symbol>
        }
      />
      <resistor
        name="R1"
        resistance="10k"
        schSectionName="charger"
        schOrientation="horizontal"
        connections={{ pin1: "net.POGO5", pin2: "net.GND" }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  transformSchematicElements(
    circuitJson,
    compose(translate(3, -2), rotateDEG(270)),
  )
  const source = circuit.db.source_component.getWhere({ name: "D2" })!
  const component = circuit.db.schematic_component.getWhere({
    source_component_id: source.source_component_id,
  })!
  const owner = { schematic_component_id: component.schematic_component_id }
  const stems = circuit.db.schematic_line.list(owner)
  const paths = circuit.db.schematic_path.list(owner)
  expect(stems).toHaveLength(2)
  expect(paths).toHaveLength(5)
  expect(convertCircuitJsonToSchematicSvg(circuitJson)).toMatchSvgSnapshot(
    import.meta.path,
  )
  expect(() => {
    for (const stem of stems) {
      const gap = Math.min(
        ...paths
          .flatMap((path) => path.points)
          .map((point) => Math.hypot(point.x - stem.x2, point.y - stem.y2)),
      )
      expect(gap).toBeLessThan(1e-8)
    }
  }).toThrow()
})
