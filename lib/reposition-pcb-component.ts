import type { AnyCircuitElement } from "circuit-json"
import { transformPCBElements } from "./transform-soup-elements"
import { translate } from "transformation-matrix"

export const repositionPcbComponentTo = (
  circuitJson: AnyCircuitElement[],
  pcb_component_id: string,
  newCenter: { x: number; y: number },
) => {
  const pcbComponent = circuitJson.find(
    (e) =>
      e.type === "pcb_component" &&
      (e as any).pcb_component_id === pcb_component_id,
  )
  if (!pcbComponent) return

  const currentCenter =
    "center" in pcbComponent
      ? (pcbComponent as any).center
      : { x: (pcbComponent as any).x, y: (pcbComponent as any).y }

  const dx = newCenter.x - currentCenter.x
  const dy = newCenter.y - currentCenter.y

  const portIds = circuitJson
    .filter(
      (e) =>
        e.type === "pcb_port" &&
        (e as any).pcb_component_id === pcb_component_id,
    )
    .map((e) => (e as any).pcb_port_id)

  const elementsToMove = circuitJson.filter((elm) => {
    if (elm === pcbComponent) return true
    const anyElm: any = elm
    if (anyElm.pcb_component_id === pcb_component_id) return true
    if (
      Array.isArray(anyElm.pcb_component_ids) &&
      anyElm.pcb_component_ids.includes(pcb_component_id)
    )
      return true
    if (anyElm.pcb_port_id && portIds.includes(anyElm.pcb_port_id)) return true
    if (
      Array.isArray(anyElm.pcb_port_ids) &&
      anyElm.pcb_port_ids.some((id: string) => portIds.includes(id))
    )
      return true
    if (anyElm.start_pcb_port_id && portIds.includes(anyElm.start_pcb_port_id))
      return true
    if (anyElm.end_pcb_port_id && portIds.includes(anyElm.end_pcb_port_id))
      return true
    if (
      Array.isArray(anyElm.route) &&
      anyElm.route.some(
        (pt: any) =>
          (pt.start_pcb_port_id && portIds.includes(pt.start_pcb_port_id)) ||
          (pt.end_pcb_port_id && portIds.includes(pt.end_pcb_port_id)),
      )
    )
      return true
    return false
  })

  const matrix = translate(dx, dy)
  transformPCBElements(elementsToMove, matrix)
}
