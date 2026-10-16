import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { categorizeErrorOrWarning } from "../lib/categorize-error-or-warning"

test("a chip that fails to build is included in the netlist category", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={56} height={32} routingDisabled>
      <chip
        name="U1"
        footprint="soic8"
        pinLabels={{ pin1: "VIN", pin2: "GND", pin3: "EN", pin4: "OUT" }}
        schPinArrangement={{
          leftSide: { pins: ["VIN", "EN_TYPO"], direction: "top-to-bottom" },
          rightSide: { pins: ["OUT", "GND"], direction: "top-to-bottom" },
        }}
        connections={{ VIN: "net.VCC", GND: "net.GND" }}
        pcbX={-9}
        pcbY={6}
      />
      <resistor
        name="R1"
        resistance="100k"
        footprint="0402"
        connections={{ pin1: "net.VCC", pin2: "net.GND" }}
        pcbX={9}
        pcbY={6}
      />
      <pcbnotetext
        text="FAILED COMPONENT / NETLIST CATEGORY REPRO"
        pcbY={13}
        fontSize={1}
      />
      <pcbnotetext
        text="schPinArrangement names EN_TYPO, not a pin label"
        pcbY={-1}
        fontSize={0.9}
      />
      <pcbnotetext
        text="U1 is not created: no pads, not in the netlist"
        pcbY={-4}
        fontSize={0.9}
      />
      <pcbnotetext
        text="Core: 1 source_failed_to_create_component_error"
        pcbY={-7}
        fontSize={0.9}
      />
      <pcbnotetext text="Category: netlist" pcbY={-10} fontSize={1} />
      <pcbnotetext
        text="Netlist filter reports 1 error"
        pcbY={-13}
        fontSize={1}
      />
    </board>,
  )
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const failedComponentErrors = circuitJson.filter(
    (element) => element.type === "source_failed_to_create_component_error",
  )
  expect(failedComponentErrors).toHaveLength(1)
  expect(
    circuitJson.some(
      (element) => element.type === "source_component" && element.name === "U1",
    ),
  ).toBe(false)

  expect(failedComponentErrors.map(categorizeErrorOrWarning)).toEqual([
    "netlist",
  ])

  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { showPcbNotes: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})
