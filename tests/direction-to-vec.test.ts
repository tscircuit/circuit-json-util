import { test, expect } from "bun:test"
import { directionToVec, vecToDirection } from "../lib/direction-to-vec"

test("vecToDirection round-trips all four directions", () => {
  const directions = ["up", "down", "left", "right"] as const
  for (const dir of directions) {
    expect(vecToDirection(directionToVec(dir))).toBe(dir)
  }
})
