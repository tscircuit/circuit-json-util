import type { AnyCircuitElement } from "circuit-json"

export type SubtreeOptions = {
  subcircuit_id?: string
  subcircuit_ids?: string[]
  source_group_id?: string
  source_board_id?: string
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

  // For subcircuit_id, also include nested subcircuits
  let effectiveOpts = opts
  if (opts.subcircuit_id) {
    // Find all subcircuit_ids that are children of the target subcircuit
    const subcircuitIds = new Set<string>([opts.subcircuit_id])

    // Build group hierarchy
    const groupChildren = new Map<string, string[]>()
    const groupSubcircuit = new Map<string, string>()

    for (const elm of soup) {
      if (elm.type === "source_group") {
        const groupId = elm.source_group_id
        const subcircuitId = elm.subcircuit_id
        if (subcircuitId) {
          groupSubcircuit.set(groupId, subcircuitId)
        }
        const parentId = elm.parent_source_group_id
        if (parentId) {
          if (!groupChildren.has(parentId)) {
            groupChildren.set(parentId, [])
          }
          groupChildren.get(parentId)!.push(groupId)
        }
      }
    }

    // Find the root group for the target subcircuit
    let rootGroupId: string | undefined
    for (const [groupId, subcircuitId] of groupSubcircuit) {
      if (subcircuitId === opts.subcircuit_id) {
        rootGroupId = groupId
        break
      }
    }

    if (rootGroupId) {
      // Recursively collect all child subcircuit_ids
      const collectChildSubcircuits = (groupId: string) => {
        const children = groupChildren.get(groupId) || []
        for (const childId of children) {
          const childSubcircuit = groupSubcircuit.get(childId)
          if (childSubcircuit) {
            subcircuitIds.add(childSubcircuit)
          }
          collectChildSubcircuits(childId)
        }
      }
      collectChildSubcircuits(rootGroupId)

      // Update opts to include all these subcircuits
      effectiveOpts = { ...opts, subcircuit_ids: Array.from(subcircuitIds) }
    }
  }

  const idMap = new Map<string, AnyCircuitElement>()
  for (const elm of soup) {
    const idKey = `${elm.type}_id` as keyof typeof elm
    const idVal = elm[idKey]
    if (typeof idVal === "string") {
      idMap.set(idVal, elm)
    }
  }

  const adj = new Map<AnyCircuitElement, Set<AnyCircuitElement>>()
  for (const elm of soup) {
    const entries = Object.entries(elm)
    for (const [key, val] of entries) {
      if (key === "parent_source_group_id") continue // Skip parent relationships to avoid traversing up
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
    let shouldInclude = false
    if (
      effectiveOpts.subcircuit_id &&
      "subcircuit_id" in elm &&
      elm.subcircuit_id === effectiveOpts.subcircuit_id
    ) {
      shouldInclude = true
    } else if (
      effectiveOpts.subcircuit_ids &&
      "subcircuit_id" in elm &&
      elm.subcircuit_id &&
      effectiveOpts.subcircuit_ids.includes(elm.subcircuit_id)
    ) {
      shouldInclude = true
    } else if (
      effectiveOpts.source_group_id &&
      "source_group_id" in elm &&
      elm.source_group_id === effectiveOpts.source_group_id
    ) {
      shouldInclude = true
    } else if (
      effectiveOpts.source_group_id &&
      "member_source_group_ids" in elm &&
      Array.isArray(elm.member_source_group_ids) &&
      elm.member_source_group_ids.includes(effectiveOpts.source_group_id)
    ) {
      shouldInclude = true
    }

    if (shouldInclude) {
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
