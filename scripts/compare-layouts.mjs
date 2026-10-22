// Compare layout data between reference and app.
// Usage: node scripts/compare-layouts.mjs <ref-file> <app-file>
import { readFileSync } from 'node:fs';

const [refFile, appFile] = process.argv.slice(2);
if (!refFile || !appFile) {
  console.error('usage: node scripts/compare-layouts.mjs <ref-file> <app-file>');
  process.exit(1);
}

const ref = JSON.parse(readFileSync(refFile, 'utf8'));
const app = JSON.parse(readFileSync(appFile, 'utf8'));

const refNodes = ref.nodes;
const appNodes = app.nodes;

// Index app nodes by class for matching
const appByClass = new Map();
for (const n of appNodes) {
  const classes = String(n.cls || '').split(/\s+/).filter(Boolean);
  for (const c of classes) {
    if (!appByClass.has(c)) appByClass.set(c, []);
    appByClass.get(c).push(n);
  }
}

// Key CMS classes to check
const KEY_CLASSES = [
  // Header
  'header-container', 'header-content', 'header-grid', 'navbar-brand', 'navbar-brand__logo',
  'nav-location', 'dropdown-button', 'store-selector', 'header-search', 'header-user',
  'header-button', 'cart-button-wrapper', 'header-mobile',
  // Hero
  'home-intro', 'home-carousel', 'slide', 'media-holder', 'info', 'cta-holder',
  'hero-stickers', 'hero-sticker',
  // Categories
  'our-categories', 'title', 'category-carousel', 'category-slide', 'category-slide__media',
  'category-slide__label',
  // Ticker
  'ticker', 'ticker-wrapper', 'ticker-content', 'ticker-stickers', 'ticker icon-belt',
  // Product preview (Sizzling Specials)
  'product-preview', 'product-carousel', 'product-card', 'product-details',
  'product-header', 'product-title', 'product-pricing', 'currentPrice', 'addtoCart',
  'product-image', 'navigation', 'arrow-prev', 'arrow-next', 'swiper-pagination',
  // Promotion banner (Our Specials)
  'our-specials', 'specials-carousel', 'specials-slide', 'special-slide', 'media-holder',
  'promotion-desktop-thumbnail', 'promotion-mobile-thumbnail',
  // Quality You Can Taste (Discover)
  'discover-area', 'banner', 'info-card-area',
  // Recipes Made Easy
  'recipes-preview', 'recipe-carousel', 'recipe-card', 'recipe-details', 'recipe-header',
  'recipe-timing', 'timing', 'media-thumb', 'recipe-info',
  // Heritage
  'info-card', 'info', 'year-est', 'thumb', 'details', 'body',
  // South Africas Favourites
  'product-preview favourites', 'product-card', 'product-title', 'currentPrice', 'addtoCart',
  // Find an Eskort
  'find-area', 'cta-holder',
  // Footer
  'footer', 'footer-content', 'footer-block', 'copyright', 'social-icons',
  // Generic
  'btn', 'btn--primary', 'btn--secondary', 'btn--black', 'btn--text', 'btn--red',
  'carousel__nav', 'carousel__arrow', 'carousel__track', 'carousel__dots', 'carousel__dot',
  'carousel__pause',
];

console.log('=== KEY ELEMENT COMPARISON ===\n');

let totalChecked = 0;
let totalMatching = 0;

for (const keyCls of KEY_CLASSES) {
  const refMatches = refNodes.filter((n) => String(n.cls || '') === keyCls || String(n.cls || '').includes(keyCls));
  const appMatches = appByClass.get(keyCls) || [];

  if (refMatches.length === 0 || appMatches.length === 0) {
    console.log(`SKIP ${keyCls} (ref=${refMatches.length} app=${appMatches.length}) - missing`);
    continue;
  }

  // Compare first match of each
  const r = refMatches[0];
  const a = appMatches[0];

  totalChecked++;
  const props = [
    'bg', 'color', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight',
    'textTransform', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'borderRadius',
    'w', 'h', 'x', 'y',
  ];
  const diffs = [];
  for (const p of props) {
    if (r[p] !== a[p]) diffs.push(`${p}: ref=${r[p]} app=${a[p]}`);
  }

  if (diffs.length === 0) {
    totalMatching++;
    console.log(`OK   ${keyCls} (ref=${refMatches.length} app=${appMatches.length})`);
  } else {
    console.log(`--   ${keyCls} (ref=${refMatches.length} app=${appMatches.length})`);
    diffs.forEach((d) => console.log(`       ${d}`));
  }
}

console.log(`\n${totalMatching}/${totalChecked} key elements match exactly`);

// Also check for missing classes
console.log('\n=== CLASSES IN REFERENCE NOT IN APP ===');
const refClasses = new Set();
for (const n of refNodes) {
  for (const c of String(n.cls || '').split(/\s+/).filter(Boolean)) refClasses.add(c);
}
const appClasses = new Set(appByClass.keys());
for (const c of [...refClasses].sort()) {
  if (!appClasses.has(c) && !c.startsWith('swiper-') && !c.startsWith('icon-') && !c.includes('fa-')) {
    console.log(`  MISSING: ${c}`);
  }
}

console.log('\n=== CLASSES IN APP NOT IN REFERENCE ===');
for (const c of [...appClasses].sort()) {
  if (!refClasses.has(c) && !c.startsWith('react-') && c !== 'carousel__slide' && c !== 'carousel__pause') {
    console.log(`  EXTRA: ${c}`);
  }
}
