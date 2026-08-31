/**
 * One-off codemod: raise every font size in globals.css to the 11px floor.
 *
 * Sizes 6-9px become 11px (mono micro-labels), 10px becomes 12px (prose).
 * Only sizes inside `font-size:` declarations and `font:` shorthands are
 * touched, so unrelated px values (padding, radii, tracks) are left alone.
 */
import { readFile, writeFile } from "node:fs/promises";

const TARGET = new URL("../app/globals.css", import.meta.url);
const SCALE = { 6: 11, 7: 11, 8: 11, 9: 11, 10: 12 };

const source = await readFile(TARGET, "utf8");
let longhand = 0;
let shorthand = 0;

let output = source.replace(/font-size:\s*(\d+)px/g, (match, size) => {
  const next = SCALE[Number(size)];
  if (!next) return match;
  longhand += 1;
  return match.replace(`${size}px`, `${next}px`);
});

// `font:` shorthand — rewrite only the size token, which is the px value
// immediately before the `/line-height` or the family name.
output = output.replace(/font:\s*[^;}]*/g, (declaration) =>
  declaration.replace(/(?<![\d.])(\d+)px(?=\s*[/\s])/g, (match, size) => {
    const next = SCALE[Number(size)];
    if (!next) return match;
    shorthand += 1;
    return `${next}px`;
  }),
);

await writeFile(TARGET, output);
console.log(`raised ${longhand} font-size declarations and ${shorthand} font shorthands`);
