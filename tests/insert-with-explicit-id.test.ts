import { expect, test } from "bun:test"
import { cju, cjuIndexed } from "../index"

test("table inserts preserve an explicit Circuit JSON element ID", () => {
  const databases = [
    cju([]),
    cjuIndexed([], { indexConfig: { byId: true, byType: true } }),
  ]

  for (const database of databases) {
    const insertedSourceTrace = database.source_trace.insert({
      source_trace_id: "source_trace_imported",
      connected_source_net_ids: [],
      connected_source_port_ids: [],
    })

    expect(insertedSourceTrace.source_trace_id).toBe("source_trace_imported")
    expect(database.source_trace.get("source_trace_imported")).toBe(
      insertedSourceTrace,
    )
  }
})
