# @tscircuit/circuit-json-util

> Previously released as `@tscircuit/soup-util`

This is a small utility library for working with [circuit json](https://github.com/tscircuit/circuit-json)

It reduces the amount of code to retrieve or join elements from circuit json, it also neatly handles all the typing.

## Exported API

| Function | Defined in | Description |
| --- | --- | --- |
| `cju` | [`lib/cju.ts`](./lib/cju.ts) | Creates the primary circuit-json utility object for querying and mutating circuit json arrays. |
| `su` | [`lib/cju.ts`](./lib/cju.ts) | Alias for `cju`. |
| `cjuIndexed` | [`lib/cju-indexed.ts`](./lib/cju-indexed.ts) | Creates an indexed utility optimized for large circuit-json datasets. |
| `transformSchematicElement` | [`lib/transform-soup-elements.ts`](./lib/transform-soup-elements.ts) | Applies a transformation matrix to a single schematic element. |
| `transformSchematicElements` | [`lib/transform-soup-elements.ts`](./lib/transform-soup-elements.ts) | Applies a transformation matrix to schematic elements in a soup. |
| `transformPCBElement` | [`lib/transform-soup-elements.ts`](./lib/transform-soup-elements.ts) | Applies a transformation matrix to a single PCB element. |
| `transformPCBElements` | [`lib/transform-soup-elements.ts`](./lib/transform-soup-elements.ts) | Applies a transformation matrix to PCB elements in a soup. |
| `transformPcbElement` | [`lib/transform-soup-elements.ts`](./lib/transform-soup-elements.ts) | Alias export for `transformPCBElement`. |
| `transformPcbElements` | [`lib/transform-soup-elements.ts`](./lib/transform-soup-elements.ts) | Alias export for `transformPCBElements`. |
| `directionToVec` | [`lib/direction-to-vec.ts`](./lib/direction-to-vec.ts) | Converts a cardinal direction to a vector. |
| `vecToDirection` | [`lib/direction-to-vec.ts`](./lib/direction-to-vec.ts) | Converts a vector to its nearest cardinal direction. |
| `rotateClockwise` | [`lib/direction-to-vec.ts`](./lib/direction-to-vec.ts) | Rotates a cardinal direction clockwise. |
| `rotateCounterClockwise` | [`lib/direction-to-vec.ts`](./lib/direction-to-vec.ts) | Rotates a cardinal direction counter-clockwise. |
| `rotateDirection` | [`lib/direction-to-vec.ts`](./lib/direction-to-vec.ts) | Rotates a direction by one or more quarter turns. |
| `oppositeDirection` | [`lib/direction-to-vec.ts`](./lib/direction-to-vec.ts) | Returns the opposite cardinal direction. |
| `oppositeSide` | [`lib/direction-to-vec.ts`](./lib/direction-to-vec.ts) | Returns the opposite side string (`left/right/top/bottom`). |
| `applySelector` | [`lib/apply-selector.ts`](./lib/apply-selector.ts) | Applies a selector string to circuit-json elements. |
| `applySelectorAST` | [`lib/apply-selector.ts`](./lib/apply-selector.ts) | Applies a parsed selector AST to circuit-json elements. |
| `getElementById` | [`lib/get-element-by-id.ts`](./lib/get-element-by-id.ts) | Finds an element by its primary id field. |
| `getElementId` | [`lib/get-element-id.ts`](./lib/get-element-id.ts) | Returns an element's primary id value. |
| `getReadableNameForElement` | [`lib/readable-name-functions/get-readable-name-for-element.ts`](./lib/readable-name-functions/get-readable-name-for-element.ts) | Produces a human-readable label for an element. |
| `getReadableNameForPcbPort` | [`lib/readable-name-functions/get-readable-name-for-pcb-port.ts`](./lib/readable-name-functions/get-readable-name-for-pcb-port.ts) | Produces a readable label for a PCB port. |
| `getReadableNameForPcbSmtpad` | [`lib/readable-name-functions/get-readable-name-for-pcb-smtpad.ts`](./lib/readable-name-functions/get-readable-name-for-pcb-smtpad.ts) | Produces a readable label for a PCB SMT pad. |
| `getReadableNameForPcbTrace` | [`lib/readable-name-functions/get-readable-name-for-pcb-trace.ts`](./lib/readable-name-functions/get-readable-name-for-pcb-trace.ts) | Produces a readable label for a PCB trace. |
| `getBoundsOfPcbElements` | [`lib/get-bounds-of-pcb-elements.ts`](./lib/get-bounds-of-pcb-elements.ts) | Computes aggregate XY bounds for PCB elements. |
| `getBoardBounds` | [`lib/get-board-bounds.ts`](./lib/get-board-bounds.ts) | Computes board bounds/size from `width`+`height`+`center`, or from `outline` points. |
| `findBoundsAndCenter` | [`lib/find-bounds-and-center.ts`](./lib/find-bounds-and-center.ts) | Computes bounds and center for a set of points. |
| `getPrimaryId` | [`lib/get-primary-id.ts`](./lib/get-primary-id.ts) | Returns the name of an element type's primary id field. |
| `buildSubtree` | [`lib/subtree.ts`](./lib/subtree.ts) | Builds a relation-aware subtree from selected root elements. |
| `repositionPcbComponentTo` | [`lib/reposition-pcb-component.ts`](./lib/reposition-pcb-component.ts) | Repositions a PCB component and its linked PCB primitives. |
| `repositionPcbGroupTo` | [`lib/reposition-pcb-group.ts`](./lib/reposition-pcb-group.ts) | Repositions all PCB elements in a source group. |
| `repositionSchematicComponentTo` | [`lib/reposition-schematic-component.ts`](./lib/reposition-schematic-component.ts) | Repositions a schematic component and linked schematic primitives. |
| `repositionSchematicGroupTo` | [`lib/reposition-schematic-group.ts`](./lib/reposition-schematic-group.ts) | Repositions all schematic elements in a source group. |
| `getCircuitJsonTree` | [`lib/getCircuitJsonTree.ts`](./lib/getCircuitJsonTree.ts) | Builds a tree representation of relation-linked circuit-json elements. |
| `getStringFromCircuitJsonTree` | [`lib/getStringFromCircuitJsonTree.ts`](./lib/getStringFromCircuitJsonTree.ts) | Renders a circuit-json tree as text for debugging. |
| `getMinimumFlexContainer` | [`lib/get-minimum-flex-container.ts`](./lib/get-minimum-flex-container.ts) | Computes a minimum flex container from layout constraints. |
| `getElementRenderLayers` | [`lib/get-element-render-layers.ts`](./lib/get-element-render-layers.ts) | Returns schematic/PCB render layers used for an element. |

## Standard Usage

```ts
import { su } from "@tscircuit/circuit-json-util"

const circuitJson = [
  /* [ { type: "source_component", ... }, ... ] */
]

const pcb_component = su(circuitJson).pcb_component.get("1234")

const source_component = su(circuitJson).source_component.getUsing({
  pcb_component_id: "123",
})

const schematic_component = su(circuitJson).schematic_component.getWhere({
  width: 1,
})

const source_traces = su(circuitJson).source_trace.list({
  source_component_id: "123",
})
```

## Optimized Indexed Version

For large circuit json, the library provides an optimized version with indexing for faster lookups:

```ts
import { suIndexed } from "@tscircuit/circuit-json-util"

const circuitJson = [
  /* large soup with many elements */
]

// Configure the indexes you want to use
const indexedSu = suIndexed(circuitJson, {
  indexConfig: {
    byId: true, // Index by element ID for fast .get() operations
    byType: true, // Index by element type for fast .list() operations
    byRelation: true, // Index relation fields (fields ending with _id)
    bySubcircuit: true, // Index by subcircuit_id for fast subcircuit filtering
    byCustomField: ["name", "ftype"], // Index specific fields you query often
  },
})

// Use the same API as the standard version, but with much better performance
const pcb_component = indexedSu.pcb_component.get("1234") // O(1) lookup

// Fast filtering by subcircuit
const subcircuitElements = indexedSu.source_component.list({
  subcircuit_id: "main",
})
```

The indexed version maintains the same API as the standard version but provides significant performance improvements, especially for large circuit json arrays.

## Repositioning PCB Components

Use `repositionPcbComponentTo` to move a component and all of its related elements to a new center:

```ts
import { repositionPcbComponentTo } from "@tscircuit/circuit-json-util"

repositionPcbComponentTo(circuitJson, "pc1", { x: 10, y: 5 })
```

All ports, pads and traces referencing the component are translated by the same offset.

Use `repositionSchematicComponentTo` to move a schematic component and all related elements:

```ts
import { repositionSchematicComponentTo } from "@tscircuit/circuit-json-util"

repositionSchematicComponentTo(circuitJson, "sc1", { x: 10, y: 5 })
```

Move all elements in a schematic source group with `repositionSchematicGroupTo`:

```ts
import { repositionSchematicGroupTo } from "@tscircuit/circuit-json-util"

repositionSchematicGroupTo(circuitJson, "g1", { x: 20, y: 15 })
```


