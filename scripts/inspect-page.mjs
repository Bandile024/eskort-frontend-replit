// Dev utility: drive headless Chrome over CDP to check the rendered homepage —
// console errors, the block structure, and a few computed styles.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME =
  process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_TO_OPEN = process.argv[2] ?? 'http://127.0.0.1:5000/';
const VIEWPORT_WIDTH = Number(process.argv[3] ?? 1600);
const VIEWPORT_HEIGHT = Number(process.argv[4] ?? 1200);
const PORT = 9222 + Math.floor(Math.random() * 400);
const PROFILE = `${process.env.TEMP}\\kilo\\cdp-profile-${PORT}`;

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--window-size=1600,1200',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

const ws = new WebSocket(await getWsUrl());
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let nextId = 1;
const pending = new Map();
const events = [];

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  } else if (msg.method) {
    events.push(msg);
  }
});

function send(method, params = {}, sessionId) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Log.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send(
  'Emulation.setDeviceMetricsOverride',
  { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1, mobile: VIEWPORT_WIDTH < 700 },
  sessionId,
);

await send('Page.navigate', { url: URL_TO_OPEN }, sessionId);
await sleep(9000);

const evaluate = async (expression) => {
  const { result } = await send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  );
  return result.value;
};

  const report = await evaluate(`(() => {
  const q = (s) => document.querySelector(s);
  const style = (s, props) => {
    const el = q(s);
    if (!el) return s + ' -> MISSING';
    const cs = getComputedStyle(el);
    return s + ' -> ' + props.map((p) => p + ':' + cs[p]).join('; ');
  };
  const sections = [...document.querySelectorAll('main section, main ul')].map((el) => ({
    tag: el.tagName.toLowerCase(),
    cls: el.className,
    height: Math.round(el.getBoundingClientRect().height),
    children: el.children.length,
  }));
  return {
    title: document.title,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyFont: getComputedStyle(document.body).fontFamily,
    h1Font: q('h1') ? getComputedStyle(q('h1')).fontFamily : 'no h1',
    h1Size: q('h1') ? getComputedStyle(q('h1')).fontSize : null,
    scriptFont: q('.title-pair__two') ? getComputedStyle(q('.title-pair__two')).fontFamily : 'none',
    scriptSize: q('.title-pair__two') ? getComputedStyle(q('.title-pair__two')).fontSize : null,
    fontsLoaded: {
      gobold: document.fonts.check('32px Gobold'),
      spaza: document.fonts.check('32px EskortSpaza'),
      montserrat: document.fonts.check('16px Montserrat'),
    },
    loadedFontFaces: [...document.fonts].map((f) => f.family + ' ' + f.weight + ' ' + f.status),
    heroText: q('.home-intro .info') ? q('.home-intro .info').innerText.replace(/\\s+/g,' ').slice(0,160) : null,
    heroImageLoaded: (() => { const i = q('.home-intro .media-holder img, .home-intro .media-holder video'); return i ? (i.tagName === 'IMG' ? i.complete && i.naturalWidth > 0 : true) : false; })(),
    recipeCards: document.querySelectorAll('.recipe-card').length,
    recipeTitles: [...document.querySelectorAll('.recipe-card__title')].map((e) => e.textContent),
    recipeTimings: [...document.querySelectorAll('.recipe-card__timing')].map((e) => e.textContent),
    recipeImgs: document.querySelectorAll('.recipe-card__media img, .recipe-card__media video').length,
    productCards: document.querySelectorAll('.product-card').length,
    productPrices: [...document.querySelectorAll('.product-card__price')].map((e) => e.textContent),
    productImgs: document.querySelectorAll('.product-card__media img').length,
    categorySlides: document.querySelectorAll('.category-slide').length,
    categoryLogos: document.querySelectorAll('.category-slide__media img').length,
    categoryLabels: [...document.querySelectorAll('.category-slide__label')].map((e) => e.textContent),
    stickerImgs: document.querySelectorAll('.ticker .ticker-content img').length,
    specialsImgs: document.querySelectorAll('.specials-slide__media img').length,
    infoCardImgs: document.querySelectorAll('.info-card .thumb img, .info-card .thumb video').length,
    discoverImg: document.querySelectorAll('.discover-area .banner img').length,
    buttons: [...document.querySelectorAll('.btn')].map((e) => e.textContent.trim()).slice(0, 14),
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    overflowing: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2)
      .slice(0, 12)
      .map((el) => el.tagName.toLowerCase() + '.' + (el.className || '').toString().slice(0, 60) +
        ' right=' + Math.round(el.getBoundingClientRect().right)),
    sections,
    styles: [
      style('.home-intro', ['height','backgroundColor']),
      style('.our-categories', ['backgroundColor','padding']),
      style('.product-preview', ['backgroundColor']),
      style('.recipes-preview', ['backgroundColor']),
      style('.discover-area', ['backgroundColor']),
      style('.find-area', ['backgroundColor']),
      style('.info-card-area', ['backgroundColor','display']),
      style('.recipe-card__body', ['backgroundColor','borderRadius']),
      style('.recipe-card__timing', ['backgroundColor','color','fontSize']),
      style('.product-card__body', ['backgroundColor','borderRadius']),
      style('.product-card__price', ['color','fontSize']),
      style('.btn--primary', ['backgroundColor','color','borderRadius']),
      style('.ticker.icon-belt', ['backgroundColor']),
      style('.site-header', ['backgroundColor','position']),
    ],
  };
})()`);

const consoleErrors = events
  .filter((e) => e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type))
  .map((e) => `${e.params.type}: ${e.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
const logEntries = events
  .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
  .map((e) => `log: ${e.params.entry.text}`);
const badResponses = events
  .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
  .map((e) => `${e.params.response.status} ${e.params.response.url}`);
const failedRequests = events
  .filter((e) => e.method === 'Network.loadingFailed')
  .map((e) => `failed: ${e.params.errorText}`);

console.log(JSON.stringify(report, null, 2));
console.log('\n--- console errors/warnings ---');
console.log([...consoleErrors, ...logEntries, ...badResponses, ...failedRequests].join('\n') || '(none)');

writeFileSync(`${process.env.TEMP}\\kilo\\cdp-report.json`, JSON.stringify({ report, events: consoleErrors }, null, 2));

ws.close();
chrome.kill();
process.exit(0);
