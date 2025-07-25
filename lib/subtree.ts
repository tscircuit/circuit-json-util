import type { AnyCircuitElement } from "circuit-json"

export interface CircuitJsonTreeNode {
  node_type: "group" | "component"
  source_group_id?: string
  pcb_component_id?: string
  source_component_id?: string
  schematic_component_id?: string
  element: AnyCircuitElement
  children: Array<CircuitJsonTreeNode | AnyCircuitElement>
}

export type SubtreeOptions = {
  subcircuit_id?: string
  source_group_id?: string
}

function connect(
  map: Map<AnyCircuitElement, Set<AnyCircuitElement>>,
  a: AnyCircuitElement | undefined,
  b: AnyCircuitElement | undefined,
) {
  if (!a || !b) return
  let setA = map.get(a)
  if (!setA) {
    setA = new Set()
    map.set(a, setA)
  }
  setA.add(b)
  let setB = map.get(b)
  if (!setB) {
    setB = new Set()
    map.set(b, setB)
  }
  setB.add(a)
}

export function buildSubtree(
  soup: AnyCircuitElement[],
  opts: SubtreeOptions,
): { tree: CircuitJsonTreeNode; elements: AnyCircuitElement[] } {
  if (!opts.subcircuit_id && !opts.source_group_id)
    return {
      tree: { node_type: "group", children: [...soup] },
      elements: [...soup],
    }

  const idMap = new Map<string, AnyCircuitElement>()
  for (const elm of soup) {
    const idVal = (elm as any)[`${elm.type}_id`]
    if (typeof idVal === "string") {
      idMap.set(idVal, elm)
    }
  }

  const adj = new Map<AnyCircuitElement, Set<AnyCircuitElement>>()
  for (const elm of soup) {
    const entries = Object.entries(elm as any)
    for (const [key, val] of entries) {
      if (key.endsWith("_id") && typeof val === "string") {
        const other = idMap.get(val)
        connect(adj, elm, other)
      } else if (key.endsWith("_ids") && Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === "string") {
            const other = idMap.get(v)
            connect(adj, elm, other)
          }
        }
      }
    }
  }

  const queue: AnyCircuitElement[] = []
  const included = new Set<AnyCircuitElement>()

  for (const elm of soup) {
    if (
      (opts.subcircuit_id &&
        (elm as any).subcircuit_id === opts.subcircuit_id) ||
      (opts.source_group_id &&
        ((elm as any).source_group_id === opts.source_group_id ||
          (Array.isArray((elm as any).member_source_group_ids) &&
            (elm as any).member_source_group_ids.includes(
              opts.source_group_id,
            ))))
    ) {
      queue.push(elm)
      included.add(elm)
    }
  }

  while (queue.length > 0) {
    const elm = queue.shift()!
    const neighbors = adj.get(elm)
    if (!neighbors) continue
    for (const n of neighbors) {
      if (!included.has(n)) {
        included.add(n)
        queue.push(n)
      }
    }
  }

  const elements = soup.filter((e) => included.has(e))

  const root: CircuitJsonTreeNode = {
    node_type: "group",
    source_group_id: opts.source_group_id,
    children: [],
    element: soup.find(
      (e) =>
        e.type === "source_group" && e.source_group_id === opts.source_group_id,
    )!,
  }

  const groupMap = new Map<string, CircuitJsonTreeNode>()
  const pcbMap = new Map<string, CircuitJsonTreeNode>()
  const schMap = new Map<string, CircuitJsonTreeNode>()

  for (const elm of elements) {
    if (elm.type === "source_group") {
      const id = (elm as any).source_group_id as string | undefined
      const node: CircuitJsonTreeNode = {
        node_type: "group",
        source_group_id: id,
        children: [],
        element: elm,
      }
      root.children.push(node)
      if (id) groupMap.set(id, node)
    }
  }

  for (const elm of elements) {
    if (elm.type === "pcb_component") {
      const pcbId = (elm as any).pcb_component_id as string | undefined
      const groupId = (elm as any).source_group_id as string | undefined
      const node: CircuitJsonTreeNode = {
        node_type: "component",
        pcb_component_id: pcbId,
        children: [],
        element: elm,
      }
      const g = groupId && groupMap.get(groupId)
      if (g) g.children.push(node)
      else root.children.push(node)
      if (pcbId) pcbMap.set(pcbId, node)
    } else if (elm.type === "schematic_component") {
      const schId = (elm as any).schematic_component_id as string | undefined
      const groupId = (elm as any).source_group_id as string | undefined
      const node: CircuitJsonTreeNode = {
        node_type: "component",
        schematic_component_id: schId,
        children: [],
        element: elm,
      }
      const g = groupId && groupMap.get(groupId)
      if (g) g.children.push(node)
      else root.children.push(node)
      if (schId) schMap.set(schId, node)
    }
  }

  for (const elm of elements) {
    if (
      elm.type === "source_group" ||
      elm.type === "pcb_component" ||
      elm.type === "schematic_component"
    ) {
      continue
    }
    const pcbId = (elm as any).pcb_component_id as string | undefined
    const schId = (elm as any).schematic_component_id as string | undefined
    const groupId = (elm as any).source_group_id as string | undefined
    if (pcbId && pcbMap.has(pcbId)) {
      pcbMap.get(pcbId)!.children.push(elm)
    } else if (schId && schMap.has(schId)) {
      schMap.get(schId)!.children.push(elm)
    } else if (groupId && groupMap.has(groupId)) {
      groupMap.get(groupId)!.children.push(elm)
    } else {
      root.children.push(elm)
    }
  }

  return { tree: root, elements }
}
