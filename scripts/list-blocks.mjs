// Dev utility: list the content blocks the home page delivers, in order,
// with the properties each block type carries.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }),
);

const base = env.VITE_UMBRACO_BASE_URL;
const key = env.VITE_UMBRACO_API_KEY;
const url = `${base}/umbraco/delivery/api/v2/content?filter=contentType:homePage&expand=properties[content]`;

const res = await fetch(url, { headers: { Accept: 'application/json', 'Api-Key': key } });
if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`);
  process.exit(1);
}
const data = await res.json();
const items = data.items ?? [];

for (const it of items) {
  console.log(`\n### ${it.contentType}  (id ${it.id})`);
  const p = it.properties ?? {};
  for (const [k, v] of Object.entries(p)) {
    if (v && typeof v === 'object' && 'items' in v) {
      console.log(`  ${k}: [${v.items.length} items]`);
      v.items.forEach((sub, i) => {
        const sp = sub.content?.properties ?? {};
        const brief = Object.entries(sp)
          .filter(([, sv]) => typeof sv === 'string' || typeof sv === 'boolean')
          .map(([k2, v2]) => `${k2}=${JSON.stringify(String(v2)).slice(0, 60)}`)
          .join('  ');
        console.log(`      [${i}] ${sub.content?.contentType} ${brief}`);
        for (const [k2, v2] of Object.entries(sp)) {
          if (Array.isArray(v2)) {
            console.log(`          ${k2}: [${v2.length}] ${v2.map((x) => x.contentType ?? x.id ?? '?').join(', ')}`);
          }
        }
      });
    } else if (typeof v === 'string') {
      console.log(`  ${k}: ${JSON.stringify(v).slice(0, 120)}`);
    } else if (Array.isArray(v)) {
      console.log(`  ${k}: [${v.length}] ${v.map((x) => x.contentType ?? x.id ?? '?').join(', ')}`);
    }
  }
}
