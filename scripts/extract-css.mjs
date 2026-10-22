// Dev utility: extract rules from the compiled CMS stylesheet whose selectors
// match one of the given patterns. Usage:
//   node scripts/extract-css.mjs <css-file> <selector-substring> [...more]
import { readFileSync } from 'node:fs';

const [file, ...patterns] = process.argv.slice(2);
if (!file || patterns.length === 0) {
  console.error('usage: node scripts/extract-css.mjs <css-file> <selector-substring> [...]');
  process.exit(1);
}

const css = readFileSync(file, 'utf8');

const blocks = [];
let i = 0;
while (i < css.length) {
  const open = css.indexOf('{', i);
  if (open === -1) break;
  const prelude = css.slice(i, open).trim();
  // find matching close brace
  let depth = 1;
  let j = open + 1;
  while (j < css.length && depth > 0) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') depth--;
    j++;
  }
  const body = css.slice(open + 1, j - 1);
  blocks.push({ prelude, body, start: i });
  i = j;
}

const matches = blocks.filter(({ prelude }) => {
  if (prelude.startsWith('@')) return false;
  return patterns.some((p) => prelude.includes(p));
});

for (const { prelude, body } of matches) {
  console.log(`${prelude} {`);
  console.log(body.replace(/^/gm, '  ').trimEnd());
  console.log('}');
  console.log('');
}
console.error(`-- ${matches.length} rules matched (${blocks.length} total blocks)`);
