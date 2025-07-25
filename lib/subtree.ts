import type { AnyCircuitElement } from "circuit-json"

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
): AnyCircuitElement[] {
  if (!opts.subcircuit_id && !opts.source_group_id) return [...soup]

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
      if (key === "parent_source_group_id") continue
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

  return soup.filter((e) => included.has(e))
}
