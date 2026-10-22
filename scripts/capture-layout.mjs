// Dev utility: capture detailed layout data from both pages for comparison.
// Usage: node scripts/capture-layout.mjs <url> <output-file>
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2];
const outputFile = process.argv[3];

if (!url || !outputFile) {
  console.error('usage: node scripts/capture-layout.mjs <url> <output-file>');
  process.exit(1);
}

const port = 9700 + Math.floor(Math.random() * 400);
const profile = `${process.env.TEMP}\\kilo\\capture-layout-${port}`;
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--ignore-certificate-errors',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--window-size=1600,1200',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

const ws = new WebSocket(await getWsUrl());
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});
const send = (method, params = {}, sessionId) => {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
};

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send(
  'Emulation.setDeviceMetricsOverride',
  { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false },
  sessionId,
);
await send('Page.navigate', { url }, sessionId);

let loaded = false;
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Page.loadEventFired') loaded = true;
});
const deadline = Date.now() + 60000;
while (!loaded && Date.now() < deadline) await sleep(250);
await sleep(3000);

const { result } = await send(
  'Runtime.evaluate',
  {
    expression: `(() => {
      try {
        const nodes = [];
        document.querySelectorAll('*').forEach((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const cls = el.className || '';
          const tag = el.tagName.toLowerCase();
          const id = el.id || '';
          if (r.width > 0 && r.height > 0) {
            nodes.push({
              tag,
              cls,
              id,
              x: Math.round(r.x),
              y: Math.round(r.y),
              w: Math.round(r.width),
              h: Math.round(r.height),
              bg: cs.backgroundColor,
              color: cs.color,
              fontFamily: cs.fontFamily,
              fontSize: cs.fontSize,
              fontWeight: cs.fontWeight,
              letterSpacing: cs.letterSpacing,
              lineHeight: cs.lineHeight,
              textTransform: cs.textTransform,
              paddingTop: cs.paddingTop,
              paddingRight: cs.paddingRight,
              paddingBottom: cs.paddingBottom,
              paddingLeft: cs.paddingLeft,
              marginTop: cs.marginTop,
              marginRight: cs.marginRight,
              marginBottom: cs.marginBottom,
              marginLeft: cs.marginLeft,
              borderRadius: cs.borderRadius,
              display: cs.display,
              position: cs.position,
              flexDirection: cs.flexDirection,
              justifyContent: cs.justifyContent,
              alignItems: cs.alignItems,
              overflow: cs.overflow,
              textAlign: cs.textAlign,
            });
          }
        });
        return nodes;
      } catch (e) {
        return { error: String(e) };
      }
    })()`,
    returnByValue: true,
  },
  sessionId,
);

const evalResult = result.value;
if (!evalResult || !Array.isArray(evalResult)) {
  console.error('Evaluation result is not an array:', JSON.stringify(evalResult)?.slice(0, 500));
  ws.close();
  chrome.kill();
  process.exit(1);
}

writeFileSync(outputFile, JSON.stringify({ url, nodes: evalResult }, null, 2));
console.log(`Captured ${evalResult.length} nodes from ${url}`);

ws.close();
chrome.kill();
process.exit(0);
