// Dev utility: compare the computed styles of the React homepage against the
// live CMS front-end, section by section, to verify the design port.
import { spawn } from 'node:child_process';

const CHROME =
  process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CMS_URL = 'https://localhost:44322/';
const APP_URL = 'http://127.0.0.1:5000/';

/** [label, cmsSelector, appSelector, properties] */
const CHECKS = [
  ['hero band', 'article.home-intro', 'section.home-intro', ['height', 'background-color', 'padding']],
  ['hero media', '.home-intro .slide .media-holder', '.home-intro .slide .media-holder', ['position', 'z-index']],
  ['hero heading', '.home-intro .slide .info :is(h1, h2)', '.home-intro .slide .info :is(h1, h2)', ['color', 'font-size', 'font-family', 'letter-spacing']],
  ['hero script line', '.home-intro .slide .info h1 span, .home-intro .slide .info h2 span', '.home-intro .title-pair__two', ['color', 'font-size', 'font-family']],
  ['categories band', 'article.our-categories', 'section.our-categories', ['background-color', 'padding', 'align-items']],
  ['categories heading', '.our-categories .title h3', '.our-categories .title h3', ['color', 'text-align', 'font-size']],
  ['categories script', '.our-categories .title h3 span', '.our-categories .title-pair__two', ['color', 'font-size', 'font-family']],
  ['ticker belt', '.ticker.icon-belt', '.ticker.icon-belt', ['background-color', 'padding', 'overflow']],
  ['ticker image', '.ticker.icon-belt .ticker-content img', '.ticker.icon-belt .ticker-content img', ['height', 'object-fit']],
  ['product band', 'article.product-preview', 'section.product-preview', ['background-color', 'padding']],
  ['product heading', '.product-preview .title h3', '.product-preview .title h3', ['color', 'font-size']],
  ['product script', '.product-preview .title h3 span', '.product-preview .title-pair__two', ['color', 'font-size']],
  ['product card', '.product-card .product-details', '.product-card__body', ['background-color', 'border-radius', 'padding', 'align-items']],
  ['product title', '.product-card .product-title', '.product-card__title', ['color', 'font-size', 'font-weight', 'text-transform']],
  ['product price', '.product-card .product-pricing h2', '.product-card__price', ['color', 'font-size', 'font-weight']],
  ['favourites band', 'article.product-preview.favourites', 'section.product-preview.favourites', ['background-color', 'padding']],
  ['favourites heading', '.product-preview.favourites .title h3', '.product-preview.favourites .title h3', ['color']],
  ['recipes band', 'article.recipes-preview', 'section.recipes-preview', ['background-color', 'background-size']],
  ['recipes heading', '.recipes-preview .title h3', '.recipes-preview .title h3', ['color', 'font-size']],
  ['recipes script', '.recipes-preview .title h3 span', '.recipes-preview .title-pair__two', ['color', 'font-size']],
  ['recipe card', '.recipe-card .recipe-details', '.recipe-card__body', ['background-color', 'border-radius']],
  ['recipe media', '.recipe-card .recipe-details .recipe-header', '.recipe-card__media', ['aspect-ratio', 'overflow', 'position']],
  ['recipe timing', '.recipe-card .recipe-details .recipe-header .recipe-timing', '.recipe-card__timing', ['background-color', 'color', 'border-radius', 'padding', 'font-size', 'font-weight', 'text-transform']],
  ['recipe title', '.recipe-card .recipe-details .recipe-info h4', '.recipe-card__title', ['color', 'font-size', 'text-transform', 'line-height']],
  ['info card area', 'article.info-card-area', 'ul.info-card-area', ['background-color', 'padding']],
  ['info card', '.info-card .details', '.info-card .details', ['background-color', 'border-radius', 'align-items']],
  ['info card title', '.info-card .details .info .title h3', '.info-card .title h3', ['color']],
  ['info card script', '.info-card .details .info .title h3 span', '.info-card .title-pair__two', ['color']],
  ['discover band', 'article.discover-area', 'section.discover-area', ['background-color', 'min-height', 'align-items']],
  ['discover heading', '.discover-area .title h2', '.discover-area .title h2', ['color', 'font-size']],
  ['discover script', '.discover-area .title h2 span', '.discover-area .title-pair__two', ['color', 'font-size']],
  ['find band', 'article.find-area', 'section.find-area', ['background-color', 'padding', 'align-items']],
  ['find heading', '.find-area .title h2', '.find-area .title h2', ['color', 'text-align', 'font-size']],
  ['find script', '.find-area .title h2 span', '.find-area .title-pair__two', ['color', 'font-size']],
  ['hero primary button', '.home-intro .cta-holder .btn', '.home-intro .btn--primary', ['background-color', 'color', 'border-radius', 'padding', 'font-size', 'font-weight', 'text-transform']],
  ['page background', 'html', 'html', ['background-color']],
  ['body font', 'body', 'body', ['font-family']],
];

/** Rendered box sizes: [label, cmsSelector, appSelector] */
const BOX_CHECKS = [
  ['product card box', '.product-card .product-details', '.product-card__body'],
  ['product image box', '.product-card .product-image', '.product-card__media'],
  ['recipe card box', '.recipe-card .recipe-details', '.recipe-card__body'],
  ['recipe media box', '.recipe-card .recipe-details .recipe-header', '.recipe-card__media'],
  ['recipe info box', '.recipe-card .recipe-details .recipe-info', '.recipe-card__info'],
  ['hero slide box', '.home-intro .slide', '.home-intro .slide'],
  ['category band box', 'article.our-categories', 'section.our-categories'],
  ['product band box', 'article.product-preview', 'section.product-preview'],
  ['recipes band box', 'article.recipes-preview', 'section.recipes-preview'],
  ['discover band box', 'article.discover-area', 'section.discover-area'],
  ['find band box', 'article.find-area', 'section.find-area'],
  ['info card area box', 'article.info-card-area', 'ul.info-card-area'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Launches a dedicated headless Chrome, snapshots `url`, then shuts it down. */
async function snapshot(url, mode, waitMs) {
  const port = 9600 + Math.floor(Math.random() * 400);
  const profile = `${process.env.TEMP}\\kilo\\cdp-compare-${port}`;
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

  let wsUrl = null;
  for (let i = 0; i < 80 && !wsUrl; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      wsUrl = (await res.json()).webSocketDebuggerUrl;
    } catch {
      await sleep(250);
    }
  }
  if (!wsUrl) {
    chrome.kill();
    throw new Error('Chrome DevTools endpoint never came up');
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

  let nextId = 1;
  const pending = new Map();
  const pageMessages = [];
  let loaded = false;
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method === 'Page.loadEventFired') {
      loaded = true;
    } else if (msg.method === 'Runtime.exceptionThrown') {
      pageMessages.push(
        `exception: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`,
      );
    } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      pageMessages.push(
        `${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`,
      );
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
  // The CMS front-end is a 6 MB page and takes ~25s to serve; wait for the
  // load event rather than a fixed delay.
  const deadline = Date.now() + waitMs;
  while (!loaded && Date.now() < deadline) await sleep(250);
  await sleep(2000);

  const probes = CHECKS.map(([label, cmsSel, appSel, props]) => ({
    label,
    selector: mode === 'cms' ? cmsSel : appSel,
    props,
  }));
  const boxProbes = BOX_CHECKS.map(([label, cmsSel, appSel]) => ({
    label,
    selector: mode === 'cms' ? cmsSel : appSel,
  }));

  const { result } = await send(
    'Runtime.evaluate',
    {
      expression: `(() => {
        const out = { __diag: { title: document.title, url: location.href, nodes: document.body ? document.body.children.length : -1 } };
        for (const { label, selector, props } of ${JSON.stringify(probes)}) {
          const el = document.querySelector(selector);
          if (!el) { out[label] = { __missing: selector }; continue; }
          const cs = getComputedStyle(el);
          out[label] = Object.fromEntries(props.map((p) => [p, cs[p]]));
        }
        for (const { label, selector } of ${JSON.stringify(boxProbes)}) {
          const el = document.querySelector(selector);
          if (!el) { out['box:' + label] = { __missing: selector }; continue; }
          const r = el.getBoundingClientRect();
          out['box:' + label] = { width: Math.round(r.width), height: Math.round(r.height) };
        }
        return out;
      })()`,
      returnByValue: true,
    },
    sessionId,
  );

  ws.close();
  chrome.kill();
  await sleep(500);
  return { ...result.value, __messages: pageMessages };
}

const app = await snapshot(APP_URL, 'app', 12000);
const cms = await snapshot(CMS_URL, 'cms', 45000);
console.log('APP diag:', JSON.stringify(app.__diag));
console.log('CMS diag:', JSON.stringify(cms.__diag));
if (app.__messages?.length) console.log('APP messages:\n  ' + app.__messages.join('\n  '));
console.log('');

let same = 0;
let different = 0;
for (const [label, , , props] of CHECKS) {
  const c = cms[label] ?? {};
  const a = app[label] ?? {};
  if (c.__missing || a.__missing) {
    console.log(`?? ${label}: cms=${c.__missing ? 'MISSING' : 'ok'} app=${a.__missing ? 'MISSING ' + a.__missing : 'ok'}`);
    continue;
  }
  const diffs = props
    .filter((p) => (c[p] ?? '') !== (a[p] ?? ''))
    .map((p) => `${p}: cms=${c[p]} | app=${a[p]}`);
  if (diffs.length === 0) {
    same++;
    console.log(`OK  ${label}`);
  } else {
    different++;
    console.log(`--  ${label}`);
    diffs.forEach((d) => console.log(`      ${d}`));
  }
}
console.log(`\n${same} identical, ${different} different`);

console.log('\n--- rendered box sizes (cms vs app) ---');
for (const [label] of BOX_CHECKS) {
  const c = cms['box:' + label] ?? {};
  const a = app['box:' + label] ?? {};
  if (c.__missing || a.__missing) {
    console.log(`??  ${label}: cms=${c.__missing ? 'MISSING' : 'ok'} app=${a.__missing ? 'MISSING' : 'ok'}`);
    continue;
  }
  const flag = c.width === a.width && c.height === a.height ? 'OK ' : '-- ';
  console.log(`${flag} ${label}: cms=${c.width}x${c.height} app=${a.width}x${a.height}`);
}

process.exit(0);
