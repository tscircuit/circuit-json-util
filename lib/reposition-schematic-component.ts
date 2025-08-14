import type { AnyCircuitElement } from "circuit-json"
import { transformSchematicElements } from "./transform-soup-elements"
import { translate } from "transformation-matrix"

export const repositionSchematicComponentTo = (
  circuitJson: AnyCircuitElement[],
  schematic_component_id: string,
  newCenter: { x: number; y: number },
) => {
  const schematicComponent = circuitJson.find(
    (e) =>
      e.type === "schematic_component" &&
      (e as any).schematic_component_id === schematic_component_id,
  )
  if (!schematicComponent) return

  const currentCenter =
    "center" in schematicComponent
      ? (schematicComponent as any).center
      : { x: (schematicComponent as any).x, y: (schematicComponent as any).y }

  const dx = newCenter.x - currentCenter.x
  const dy = newCenter.y - currentCenter.y

  const portIds = circuitJson
    .filter(
      (e) =>
        e.type === "schematic_port" &&
        (e as any).schematic_component_id === schematic_component_id,
    )
    .map((e) => (e as any).schematic_port_id)

  const elementsToMove = circuitJson.filter((elm) => {
    if (elm === schematicComponent) return true
    const anyElm: any = elm
    if (anyElm.schematic_component_id === schematic_component_id) return true
    if (
      Array.isArray(anyElm.schematic_component_ids) &&
      anyElm.schematic_component_ids.includes(schematic_component_id)
    )
      return true
    if (anyElm.schematic_port_id && portIds.includes(anyElm.schematic_port_id))
      return true
    if (
      Array.isArray(anyElm.schematic_port_ids) &&
      anyElm.schematic_port_ids.some((id: string) => portIds.includes(id))
    )
      return true
    if (
      anyElm.start_schematic_port_id &&
      portIds.includes(anyElm.start_schematic_port_id)
    )
      return true
    if (
      anyElm.end_schematic_port_id &&
      portIds.includes(anyElm.end_schematic_port_id)
    )
      return true
    if (
      Array.isArray(anyElm.route) &&
      anyElm.route.some(
        (pt: any) =>
          (pt.start_schematic_port_id &&
            portIds.includes(pt.start_schematic_port_id)) ||
          (pt.end_schematic_port_id &&
            portIds.includes(pt.end_schematic_port_id)),
      )
    )
      return true
    return false
  })

  const matrix = translate(dx, dy)
  transformSchematicElements(elementsToMove, matrix)
}
