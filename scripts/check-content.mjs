#!/usr/bin/env node
/**
 * Checks which content nodes the Delivery API can actually deliver for the
 * homepage.
 *
 * Some recipes in the CMS cannot be serialized by Umbraco: a multi-value
 * picker (e.g. `categories`, `timeToCook`, `productType`) has been stored as
 * a bare string instead of a JSON array, so the Delivery API throws
 * `System.Text.Json.JsonException` and answers HTTP 500. Those cards render
 * as name-only because their image and details are unreachable.
 *
 * Usage:
 *   node scripts/check-content.mjs          # the content on the homepage
 *   node scripts/check-content.mjs --all    # every recipeDetail node
 *
 * Reads VITE_UMBRACO_BASE_URL and VITE_UMBRACO_API_KEY from .env.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function readEnv() {
  const text = await readFile(join(root, '.env'), 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = await readEnv();
const baseUrl = (env.VITE_UMBRACO_BASE_URL ?? '').replace(/\/+$/, '');
const apiKey = env.VITE_UMBRACO_API_KEY ?? '';

if (!baseUrl || !apiKey) {
  console.error('VITE_UMBRACO_BASE_URL and VITE_UMBRACO_API_KEY must be set in .env');
  process.exit(1);
}

const headers = { Accept: 'application/json', 'Api-Key': apiKey };

// Umbraco's dev certificate is self-signed. This is a local diagnostic script
// against a development CMS, so the certificate is not verified.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: response.status, body, text };
}

/** The homepage's referenced content, grouped by type. */
async function homepageContent() {
  const { status, body } = await get(
    '/umbraco/delivery/api/v2/content?filter=contentType:homePage&expand=properties[content]',
  );
  if (status !== 200 || !body?.items?.length) {
    throw new Error(`Could not load the homepage (HTTP ${status}).`);
  }

  const recipes = [];
  const products = [];
  const categories = [];

  for (const block of body.items[0].properties.content.items) {
    const content = block.content;
    if (content.contentType === 'categoryContainer') {
      for (const category of content.properties.categories ?? []) {
        categories.push({ id: category.id, name: category.name });
      }
      continue;
    }
    if (content.contentType !== 'generalSliderContainer') continue;
    for (const entry of content.properties.items.items) {
      for (const recipe of entry.content.properties.recipes ?? []) {
        recipes.push({ id: recipe.id, name: recipe.name });
      }
      for (const product of entry.content.properties.products ?? []) {
        products.push({ id: product.id, name: product.name });
      }
    }
  }

  return { recipes, products, categories };
}

/** Every published recipeDetail node, paged one at a time so a single bad
 *  node does not poison the whole page. */
async function allRecipes() {
  const first = await get('/umbraco/delivery/api/v2/content?filter=contentType:recipeDetail&take=1&skip=0');
  if (first.status !== 200 || !first.body) {
    throw new Error('Could not load the recipeDetail collection.');
  }

  const total = first.body.total ?? 0;
  const recipes = [];

  for (let skip = 0; skip < total; skip += 1) {
    const { status, body } = await get(
      `/umbraco/delivery/api/v2/content?filter=contentType:recipeDetail&take=1&skip=${skip}`,
    );
    if (status === 200 && body?.items?.[0]) {
      recipes.push({ id: body.items[0].id, name: body.items[0].name });
    }
  }
  return recipes;
}

/** Checks one node by fetching it the way the frontend does. */
async function check(id) {
  const expanded = await get(`/umbraco/delivery/api/v2/content/item/${id}?expand=properties`);
  if (expanded.status === 200 && expanded.body) {
    const properties = expanded.body.properties ?? {};
    return { ok: true, properties };
  }

  // The shell still works when the properties cannot be serialized.
  const shell = await get(`/umbraco/delivery/api/v2/content/item/${id}?fields=id,name,route`);
  return {
    ok: false,
    status: expanded.status,
    name: shell.body?.name ?? null,
    reason:
      expanded.status === 500
        ? 'properties cannot be serialized (invalid picker value in the CMS)'
        : `HTTP ${expanded.status}`,
  };
}

function describeRecipe(properties) {
  const media = properties.videoUrl
    ? `video ${properties.videoUrl}`
    : `image ${properties.headerImage?.[0]?.url ?? '—'}`;
  const time =
    properties.cookTime || properties.prepTime
      ? ` (${properties.cookTime ?? '?'} + ${properties.prepTime ?? '?'})`
      : '';
  return `${media}${time}`;
}

function describeProduct(properties) {
  const media = properties.promoImage?.[0]?.url ?? properties.images?.[0]?.url ?? 'no image';
  const price = properties.price?.formatted?.withTax ?? 'no price';
  return `${media} — ${price}`;
}

const scanAll = process.argv.includes('--all');

if (scanAll) {
  const recipes = await allRecipes();
  console.log(`Checking ${recipes.length} recipe(s) (full scan)…\n`);

  const broken = [];
  for (const recipe of recipes) {
    const result = await check(recipe.id);
    if (!result.ok) broken.push({ ...recipe, ...result });
  }

  console.log(`OK:      ${recipes.length - broken.length}`);
  console.log(`BROKEN:  ${broken.length}\n`);
  for (const recipe of broken) {
    console.log(`  ${recipe.name ?? recipe.id}`);
    console.log(`    id:     ${recipe.id}`);
    console.log(`    status: ${recipe.status ?? '—'} — ${recipe.reason}`);
  }
  process.exit(0);
}

const { recipes, products, categories } = await homepageContent();
console.log(`Checking ${recipes.length} recipe(s), ${products.length} product(s), ${categories.length} categor(ies)…\n`);

const report = async (label, nodes, describe) => {
  const broken = [];
  const healthy = [];
  for (const node of nodes) {
    const result = await check(node.id);
    if (result.ok) healthy.push({ ...node, ...result });
    else broken.push({ ...node, ...result });
  }
  console.log(`${label}: OK ${healthy.length} / BROKEN ${broken.length}`);
  for (const node of healthy) {
    console.log(`  ✓ ${node.name} — ${describe(node.properties)}`);
  }
  for (const node of broken) {
    console.log(`  ✗ ${node.name ?? node.id}`);
    console.log(`      id:     ${node.id}`);
    console.log(`      status: ${node.status ?? '—'} — ${node.reason}`);
  }
  console.log('');
  return broken.length;
};

const brokenRecipes = await report('Recipes', recipes, describeRecipe);
const brokenProducts = await report('Products', products, describeProduct);
await report('Categories', categories, (p) =>
  p.logo?.[0]?.url ? `logo ${p.logo[0].url}` : 'no logo',
);

if (brokenRecipes + brokenProducts > 0) {
  console.log('Fix: open the node in the Umbraco back office and re-save the multi-value');
  console.log('pickers (categories / timeToCook / productType). A value that is not a valid');
  console.log('JSON array makes Umbraco fail with HTTP 500 when it serializes the node.');
}
