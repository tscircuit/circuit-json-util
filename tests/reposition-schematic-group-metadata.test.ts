import { expect, test } from "bun:test"
import {
  schematic_component,
  schematic_group,
  source_simple_resistor,
  source_group,
} from "circuit-json"
import { repositionSchematicComponentTo } from "../lib/reposition-schematic-component"
import { repositionSchematicGroupTo } from "../lib/reposition-schematic-group"

const makeCircuit = () => {
  const rootSourceGroup = source_group.parse({
    type: "source_group",
    source_group_id: "source_group_root",
  })
  const childSourceGroup = source_group.parse({
    type: "source_group",
    source_group_id: "source_group_child",
    parent_source_group_id: rootSourceGroup.source_group_id,
  })
  const outsideSourceGroup = source_group.parse({
    type: "source_group",
    source_group_id: "source_group_outside",
  })
  const rootGroup = schematic_group.parse({
    type: "schematic_group",
    schematic_group_id: "schematic_group_root",
    source_group_id: rootSourceGroup.source_group_id,
    center: { x: 0, y: 0 },
    width: 10,
    height: 8,
    schematic_component_ids: ["schematic_component_a"],
  })
  const childGroup = schematic_group.parse({
    type: "schematic_group",
    schematic_group_id: "schematic_group_child",
    source_group_id: childSourceGroup.source_group_id,
    center: { x: 2, y: 1 },
    width: 4,
    height: 4,
    schematic_component_ids: ["schematic_component_b", "schematic_component_c"],
  })
  const outsideGroup = schematic_group.parse({
    type: "schematic_group",
    schematic_group_id: "schematic_group_outside",
    source_group_id: outsideSourceGroup.source_group_id,
    center: { x: 50, y: 50 },
    width: 2,
    height: 2,
    schematic_component_ids: ["schematic_component_d"],
  })
  const groups = [rootGroup, childGroup, outsideGroup]
  const componentDefinitions = [
    { name: "a", group: rootGroup, center: { x: 0, y: 0 } },
    { name: "b", group: childGroup, center: { x: 1, y: 1 } },
    { name: "c", group: childGroup, center: { x: 3, y: 1 } },
    { name: "d", group: outsideGroup, center: { x: 50, y: 50 } },
  ]
  const sourceComponents = componentDefinitions.map(({ name, group }) =>
    source_simple_resistor.parse({
      type: "source_component",
      source_component_id: `source_component_${name}`,
      source_group_id: group.source_group_id,
      ftype: "simple_resistor",
      name,
      resistance: 1000,
    }),
  )
  const components = componentDefinitions.map(({ name, group, center }) =>
    schematic_component.parse({
      type: "schematic_component",
      schematic_component_id: `schematic_component_${name}`,
      source_component_id: `source_component_${name}`,
      schematic_group_id: group.schematic_group_id,
      center,
      size: { width: 1, height: 1 },
    }),
  )
  return {
    circuit: [
      rootSourceGroup,
      childSourceGroup,
      outsideSourceGroup,
      ...sourceComponents,
      ...groups,
      ...components,
    ],
    rootGroup,
    childGroup,
    outsideGroup,
    components,
  }
}

for (const target of [
  { x: 20, y: 15 },
  { x: -12, y: 7 },
]) {
  test(`nested group metadata and components move together to (${target.x}, ${target.y})`, () => {
    const { circuit, rootGroup, childGroup, outsideGroup, components } =
      makeCircuit()
    const outsideBefore = structuredClone([outsideGroup, components[3]])
    const rootBefore = structuredClone(rootGroup)
    const childBefore = structuredClone(childGroup)

    repositionSchematicGroupTo(circuit, rootGroup.source_group_id, target)

    expect(rootGroup).toEqual({ ...rootBefore, center: target })
    expect(childGroup).toEqual({
      ...childBefore,
      center: { x: target.x + 2, y: target.y + 1 },
    })
    expect(components.slice(0, 3).map((component) => component.center)).toEqual(
      [
        target,
        { x: target.x + 1, y: target.y + 1 },
        { x: target.x + 3, y: target.y + 1 },
      ],
    )
    expect([outsideGroup, components[3]]).toEqual(outsideBefore)
  })
}

test("repeating a schematic group placement is idempotent", () => {
  const { circuit, rootGroup } = makeCircuit()
  const target = { x: 20, y: 15 }
  repositionSchematicGroupTo(circuit, rootGroup.source_group_id, target)
  const once = structuredClone(circuit)

  repositionSchematicGroupTo(circuit, rootGroup.source_group_id, target)

  expect(circuit).toEqual(once)
})

test("schematic group placement round trips preserve the entire circuit", () => {
  const { circuit, rootGroup } = makeCircuit()
  const original = structuredClone(circuit)
  const originalCenter = { ...rootGroup.center }
  repositionSchematicGroupTo(circuit, rootGroup.source_group_id, {
    x: -13,
    y: 8,
  })

  repositionSchematicGroupTo(circuit, rootGroup.source_group_id, originalCenter)

  expect(circuit).toEqual(original)
})

test("moving a nested group preserves its parent and sibling components", () => {
  const { circuit, rootGroup, childGroup, outsideGroup, components } =
    makeCircuit()
  const untouchedBefore = structuredClone([
    rootGroup,
    outsideGroup,
    components[0],
    components[3],
  ])

  repositionSchematicGroupTo(circuit, childGroup.source_group_id, {
    x: 9,
    y: -4,
  })

  expect(childGroup.center).toEqual({ x: 9, y: -4 })
  expect(components[1]!.center).toEqual({ x: 8, y: -4 })
  expect(components[2]!.center).toEqual({ x: 10, y: -4 })
  expect([rootGroup, outsideGroup, components[0], components[3]]).toEqual(
    untouchedBefore,
  )
})

test("moving one component preserves its containing group metadata", () => {
  const { circuit, rootGroup, childGroup, outsideGroup, components } =
    makeCircuit()
  const untouchedBefore = structuredClone([
    rootGroup,
    childGroup,
    outsideGroup,
    ...components.slice(1),
  ])

  repositionSchematicComponentTo(circuit, "schematic_component_a", {
    x: 20,
    y: 15,
  })

  expect(components[0]!.center).toEqual({ x: 20, y: 15 })
  expect([rootGroup, childGroup, outsideGroup, ...components.slice(1)]).toEqual(
    untouchedBefore,
  )
})
