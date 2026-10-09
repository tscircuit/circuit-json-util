// Aligns text width with circuit-to-svg rendering metrics:
// https://github.com/tscircuit/circuit-to-svg/blob/main/lib/sch/arial-text-metrics.ts
const ASCII_GLYPH_WIDTHS = [
  7, 7, 9, 13, 13, 21, 16, 5, 8, 8, 9, 14, 7, 8, 7, 7, 13, 13, 13, 13, 13, 13,
  13, 13, 13, 13, 7, 7, 14, 14, 14, 13, 24, 16, 16, 17, 17, 16, 15, 19, 17, 7,
  12, 16, 13, 20, 17, 19, 16, 19, 17, 16, 15, 17, 16, 23, 16, 16, 15, 7, 7, 7,
  11, 13, 8, 13, 13, 12, 13, 13, 7, 13, 13, 5, 5, 12, 5, 20, 13, 13, 13, 13, 8,
  12, 7, 13, 12, 17, 12, 12, 12, 8, 6, 8, 14,
] as const

export const estimateSchematicTextWidth = (text: string): number => {
  let width = 0
  for (const character of text) {
    width += ASCII_GLYPH_WIDTHS[character.codePointAt(0)! - 32] ?? 13
  }
  return width / 27
}
