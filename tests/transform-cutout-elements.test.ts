import { test, expect } from "bun:test"
import { transformPCBElements } from "../lib/transform-soup-elements"
import { rotate } from "transformation-matrix"

test("transformPCBElements handles cutout rotation correctly", () => {
  const circuitElements = [
    {
      type: "pcb_component",
      name: "J1",
      center: { x: 0, y: 0 },
      rotation: 0,
      width: 10,
      height: 5,
      cutouts: [
        {
          type: "pcb_cutout",
          center: { x: 2, y: 1 },
          width: 3,
          height: 2,
          rotation: 0
        }
      ]
    },
    {
      type: "pcb_cutout",
      center: { x: 5, y: 3 },
      width: 4,
      height: 1,
      rotation: 0
    }
  ]

  // Test 90-degree rotation
  const rotationMatrix = rotate(Math.PI / 2)
  const transformed = transformPCBElements(circuitElements, rotationMatrix)

  // Check component transformation
  const component = transformed.find((elm: any) => elm.type === "pcb_component")
  expect(component).toBeDefined()
  expect(component?.width).toBe(5)
  expect(component?.height).toBe(10)
  expect(component?.rotation).toBe(90)

  // Check cutout within component
  const componentCutout = component?.cutouts?.[0]
  expect(componentCutout).toBeDefined()
  expect(componentCutout?.width).toBe(2)
  expect(componentCutout?.height).toBe(3)
  expect(componentCutout?.rotation).toBe(90)

  // Check standalone cutout
  const standaloneCutout = transformed.find((elm: any) => elm.type === "pcb_cutout")
  expect(standaloneCutout).toBeDefined()
  expect(standaloneCutout?.width).toBe(1)
  expect(standaloneCutout?.height).toBe(4)
  expect(standaloneCutout?.rotation).toBe(90)
})

test("transformPCBElements handles multiple cutouts in component", () => {
  const circuitElements = [
    {
      type: "pcb_component",
      name: "J1",
      center: { x: 0, y: 0 },
      rotation: 0,
      width: 15,
      height: 8,
      cutouts: [
        {
          type: "pcb_cutout",
          center: { x: 3, y: 2 },
          width: 5,
          height: 3,
          rotation: 0
        },
        {
          type: "pcb_cutout",
          center: { x: -2, y: 1 },
          width: 2,
          height: 4,
          rotation: 0
        }
      ]
    }
  ]

  // Test 90-degree rotation
  const rotationMatrix = rotate(Math.PI / 2)
  const transformed = transformPCBElements(circuitElements, rotationMatrix)

  const component = transformed.find((elm: any) => elm.type === "pcb_component")
  expect(component?.cutouts).toHaveLength(2)

  // Check first cutout
  expect(component?.cutouts?.[0].width).toBe(3)
  expect(component?.cutouts?.[0].height).toBe(5)
  expect(component?.cutouts?.[0].rotation).toBe(90)

  // Check second cutout
  expect(component?.cutouts?.[1].width).toBe(4)
  expect(component?.cutouts?.[1].height).toBe(2)
  expect(component?.cutouts?.[1].rotation).toBe(90)
})

test("transformPCBElements handles 180-degree rotation correctly", () => {
  const circuitElements = [
    {
      type: "pcb_cutout",
      center: { x: 5, y: 3 },
      width: 4,
      height: 1,
      rotation: 0
    }
  ]

  // Test 180-degree rotation (should not swap width/height)
  const rotationMatrix = rotate(Math.PI)
  const transformed = transformPCBElements(circuitElements, rotationMatrix)

  const cutout = transformed.find((elm: any) => elm.type === "pcb_cutout")
  expect(cutout?.width).toBe(4) // Should not be swapped
  expect(cutout?.height).toBe(1) // Should not be swapped
  expect(cutout?.rotation).toBe(180)
})