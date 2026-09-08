import { expect, test } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { Circuit } from "tscircuit"
import { categorizeErrorOrWarning } from "../lib/categorize-error-or-warning"

test("repro: a missing pin error is excluded from the netlist category", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board width={56} height={32} routingDisabled>
      <chip
        name="U1"
        footprint="soic8"
        pinLabels={{ pin1: "GPIO26_ADC0" }}
        pcbX={-9}
        pcbY={6}
      />
      <resistor
        name="R1"
        resistance="100k"
        footprint="0402"
        pcbX={9}
        pcbY={6}
      />
      <trace from="U1.GPIO26" to="R1.pin1" />
      <pcbnotetext
        text="MISSING PIN / NETLIST CATEGORY REPRO"
        pcbY={13}
        fontSize={1}
      />
      <pcbnotetext text="Trace requests U1.GPIO26" pcbY={-1} fontSize={1} />
      <pcbnotetext text="U1 only defines GPIO26_ADC0" pcbY={-4} fontSize={1} />
      <pcbnotetext
        text="Core: 1 source_trace_not_connected_error"
        pcbY={-7}
        fontSize={0.9}
      />
      <pcbnotetext
        text="Category: unknown (expected: netlist)"
        pcbY={-10}
        fontSize={1}
      />
      <pcbnotetext
        text="Netlist filter reports 0 errors"
        pcbY={-13}
        fontSize={1}
      />
    </board>,
  )
  await circuit.renderUntilSettled()

  const circuitJson = circuit.getCircuitJson()
  const connectionErrors = circuitJson.filter(
    (element) => element.type === "source_trace_not_connected_error",
  )
  expect(connectionErrors).toHaveLength(1)
  expect(connectionErrors[0]?.selectors_not_found).toEqual(["U1.GPIO26"])

  // Capture the current bug; the fix should categorize this as "netlist".
  expect(connectionErrors.map(categorizeErrorOrWarning)).toEqual(["unknown"])
  expect(
    connectionErrors.filter(
      (error) => categorizeErrorOrWarning(error) === "netlist",
    ),
  ).toHaveLength(0)

  expect(
    convertCircuitJsonToPcbSvg(circuitJson, { showPcbNotes: true }),
  ).toMatchSvgSnapshot(import.meta.path)
})
