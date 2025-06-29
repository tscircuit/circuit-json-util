export const moveSchematicElement = (
  schematic_element_id: string,
  db: import("circuit-json").CircuitJson,
  newPosition: { x: number; y: number },
) => {
  const element = db.find(
    (e: any) =>
      (e as any)[`${e.type}_id`] === schematic_element_id,
  ) as any
  if (!element) return null

  const applyDelta = (dx: number, dy: number, obj: any) => {
    if (obj.center) {
      obj.center.x += dx
      obj.center.y += dy
    } else if (obj.position) {
      obj.position.x += dx
      obj.position.y += dy
    } else if (typeof obj.x === "number" && typeof obj.y === "number") {
      obj.x += dx
      obj.y += dy
    }
  }

  if (element.type === "schematic_component") {
    const dx = newPosition.x - element.center.x
    const dy = newPosition.y - element.center.y
    applyDelta(dx, dy, element)
    db.forEach((elm: any) => {
      if (
        elm.type === "schematic_port" &&
        elm.schematic_component_id === element.schematic_component_id
      ) {
        applyDelta(dx, dy, elm)
      }
    })
  } else if (element.type === "schematic_port") {
    element.center = { ...newPosition }
  } else if (element.type === "schematic_text") {
    element.position = { ...newPosition }
  } else if (element.type === "schematic_line") {
    const cx = (element.x1 + element.x2) / 2
    const cy = (element.y1 + element.y2) / 2
    const dx = newPosition.x - cx
    const dy = newPosition.y - cy
    element.x1 += dx
    element.x2 += dx
    element.y1 += dy
    element.y2 += dy
  } else if (element.type === "schematic_box") {
    const dx = newPosition.x - element.x
    const dy = newPosition.y - element.y
    element.x += dx
    element.y += dy
  } else if (element.type === "schematic_trace") {
    const points = [
      ...element.junctions,
      ...element.edges.flatMap((e: any) => [e.from, e.to]),
    ]
    if (points.length) {
      const cx =
        points.reduce((s: number, p: any) => s + p.x, 0) / points.length
      const cy =
        points.reduce((s: number, p: any) => s + p.y, 0) / points.length
      const dx = newPosition.x - cx
      const dy = newPosition.y - cy
      points.forEach((p: any) => {
        p.x += dx
        p.y += dy
      })
    }
  } else {
    applyDelta(newPosition.x - (element.center?.x ?? element.x ?? 0), newPosition.y - (element.center?.y ?? element.y ?? 0), element)
  }

  return element
}
