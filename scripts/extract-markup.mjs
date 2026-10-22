// Dev utility: print the markup of the first element carrying a given class.
import { readFileSync } from 'node:fs';

const [file, ...classes] = process.argv.slice(2);
const html = readFileSync(file, 'utf8');

for (const cls of classes) {
  const re = new RegExp(`<(\\w+)[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`);
  const m = re.exec(html);
  if (!m) {
    console.log(`\n===== ${cls}: NOT FOUND =====`);
    continue;
  }
  const tag = m[1];
  const start = m.index;
  const open = html.indexOf('>', start) + 1;
  let depth = 1;
  let i = open;
  const tagRe = new RegExp(`<(/?)${tag}[\\s>]`, 'g');
  tagRe.lastIndex = open;
  let mm;
  while ((mm = tagRe.exec(html))) {
    depth += mm[1] ? -1 : 1;
    if (depth === 0) { i = mm.index; break; }
  }
  const chunk = html.slice(start, i).replace(/data:[^"')]{80,}/g, 'data:...').replace(/\s+/g, ' ');
  console.log(`\n===== ${cls} =====`);
  console.log(chunk.slice(0, 3500));
}
