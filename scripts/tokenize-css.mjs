/**
 * One-off codemod: replace ad-hoc values in globals.css with design tokens.
 *
 * 1. Secondary text colors. The file accumulated ~100 near-identical
 *    desaturated greys for muted copy, most of which failed WCAG AA on the
 *    cream background. Any low-chroma grey in the secondary-text lightness
 *    band collapses to `var(--muted)`. Saturated accents (rust, sage, amber,
 *    blue) and light-on-dark text are left untouched.
 *
 * 2. Single-value px border radii snap to the shared radius scale.
 *    Percentages, multi-value radii, and `inherit` are left untouched.
 */
import { readFile, writeFile } from "node:fs/promises";

const TARGET = new URL("../app/globals.css", import.meta.url);

const MAX_CHROMA = 20;
const MIN_CHANNEL_PEAK = 0x60;
const MAX_CHANNEL_PEAK = 0xb0;

const RADIUS = new Map([
  [3, "var(--radius-xs)"], [4, "var(--radius-xs)"], [5, "var(--radius-xs)"],
  [6, "var(--radius-xs)"], [7, "var(--radius-xs)"],
  [8, "var(--radius-sm)"], [9, "var(--radius-sm)"], [10, "var(--radius-sm)"],
  [11, "var(--radius-sm)"],
  [12, "var(--radius-md)"], [13, "var(--radius-md)"], [14, "var(--radius-md)"],
  [15, "var(--radius-lg)"], [16, "var(--radius-lg)"], [18, "var(--radius-lg)"],
  [20, "var(--radius-xl)"], [22, "var(--radius-xl)"], [24, "var(--radius-xl)"],
  [99, "var(--radius-pill)"], [100, "var(--radius-pill)"], [999, "var(--radius-pill)"],
]);

const isMutedGrey = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const peak = Math.max(r, g, b);
  const chroma = peak - Math.min(r, g, b);
  return chroma <= MAX_CHROMA && peak >= MIN_CHANNEL_PEAK && peak <= MAX_CHANNEL_PEAK;
};

const source = await readFile(TARGET, "utf8");
let colors = 0;
let radii = 0;

// `(?<![-\w])` keeps this off border-color, background-color, outline-color.
let output = source.replace(/(?<![-\w])color:\s*(#[0-9a-fA-F]{6})/g, (match, hex) => {
  if (!isMutedGrey(hex)) return match;
  colors += 1;
  return "color:var(--muted)";
});

output = output.replace(/border-radius:\s*(\d+)px(?=\s*[;}])/g, (match, value) => {
  const token = RADIUS.get(Number(value));
  if (!token) return match;
  radii += 1;
  return `border-radius:${token}`;
});

await writeFile(TARGET, output);
console.log(`tokenized ${colors} muted text colors and ${radii} border radii`);
