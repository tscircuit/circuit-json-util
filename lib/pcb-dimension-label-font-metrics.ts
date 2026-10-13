/**
 * @tscircuit/alphabet 0.0.27の埋込フォントから取得した送り幅と輪郭の範囲です。
 * SHA256: 7e536a584b46e17d05af6d90aade0ca1bddca8bd5d12030676963a985c07dd50
 * 項目はadvance, minX, minY, maxX, maxYで、1em=1000単位です。
 * glyphの輪郭に合わせ、派生線フォントの幅近似を使いません。
 * 再生成手順はdocs/pcb-dimension-font-metrics.mdに記載します。
 *
 * MIT License
 *
 * Copyright (c) 2024 tscircuit Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export const pcbDimensionLabelFontMetrics: Readonly<
  Record<string, readonly [number, number, number, number, number]>
> = {
  "!": [692, 206, 6, 396, 728],
  '"': [692, 120, 406, 482, 728],
  "#": [692, -43, 5, 645, 717],
  $: [692, 31, -121, 572, 756],
  "'": [692, 256, 406, 346, 728],
  "(": [692, 145, -108, 458, 756],
  ")": [692, 144, -108, 457, 756],
  "*": [692, 36, 257, 566, 739],
  "+": [692, -2, 44, 604, 580],
  ",": [692, 170, -155, 432, 181],
  "-": [692, 129, 253, 473, 337],
  ".": [692, 195, 98, 408, 182],
  "/": [692, 18, -75, 584, 727],
  "0": [692, 20, -6, 582, 740],
  "1": [692, 176, 6, 427, 728],
  "2": [692, 35, 7, 567, 740],
  "3": [692, 26, -6, 576, 740],
  "4": [692, 4, 6, 598, 727],
  "5": [692, 30, -7, 572, 728],
  "6": [692, 20, -6, 582, 740],
  "7": [692, 27, 6, 576, 728],
  "8": [692, 19, -6, 583, 740],
  "9": [692, 46, -3, 556, 740],
  "<": [692, -2, 55, 604, 567],
  "=": [692, -2, 138, 604, 469],
  ">": [692, -2, 55, 604, 567],
  A: [692, -27, 6, 629, 728],
  B: [692, 19, 6, 583, 728],
  C: [692, 29, -5, 574, 740],
  D: [692, 19, 6, 583, 728],
  E: [692, 35, 6, 567, 728],
  F: [692, 41, 6, 561, 728],
  G: [692, 12, -6, 591, 740],
  H: [692, 22, 6, 580, 728],
  I: [692, 256, 6, 346, 728],
  J: [692, 49, -6, 553, 728],
  K: [692, -10, 6, 612, 728],
  L: [692, 30, 6, 572, 728],
  M: [692, -3, 6, 605, 728],
  N: [692, 23, 6, 579, 728],
  O: [692, 13, -6, 589, 740],
  P: [692, 26, 6, 576, 727],
  Q: [692, 13, -108, 590, 740],
  R: [692, -10, 6, 612, 728],
  S: [692, 22, -6, 580, 740],
  T: [692, -22, 6, 624, 728],
  U: [692, 27, -6, 575, 728],
  V: [692, -17, 6, 619, 728],
  W: [692, -45, 6, 647, 727],
  X: [692, -36, 6, 638, 727],
  Y: [692, -27, 6, 629, 728],
  Z: [692, 9, 6, 593, 728],
  "[": [692, 153, -108, 450, 756],
  "\\": [692, 18, -75, 584, 727],
  "]": [692, 153, -108, 450, 756],
  "^": [692, -10, 405, 612, 728],
  _: [692, -45, -193, 647, -109],
  a: [692, 30, -18, 572, 569],
  b: [692, 32, -5, 570, 756],
  c: [692, 45, -18, 557, 569],
  d: [692, 32, -5, 570, 756],
  e: [692, 15, -18, 587, 569],
  f: [692, 44, 8, 558, 756],
  g: [692, 32, -193, 570, 569],
  h: [692, 47, 8, 555, 756],
  i: [400, 115, 8, 285, 756],
  j: [692, 110, -174, 492, 756],
  k: [692, 20, 8, 582, 756],
  l: [400, 155, -5, 245, 762],
  m: [692, 6, -5, 597, 569],
  n: [692, 47, -5, 555, 569],
  o: [692, 22, -18, 580, 569],
  p: [692, 32, -187, 570, 569],
  q: [692, 32, -189, 570, 567],
  r: [692, 62, -5, 540, 569],
  s: [692, 57, -18, 545, 569],
  t: [692, 36, 4, 566, 702],
  u: [692, 47, -19, 555, 555],
  v: [692, 4, -6, 598, 556],
  w: [692, -45, -6, 647, 556],
  x: [692, -8, -6, 610, 556],
  y: [692, 0, -188, 602, 556],
  z: [692, 52, -6, 550, 557],
}
