# Eskort — Umbraco Delivery API frontend

This React application renders the published homepage from Umbraco Delivery API v2. Homepage copy, links, products, recipes, and media come from the CMS; the frontend does not include local sample content.

## Run locally

1. Set `VITE_UMBRACO_BASE_URL` to the Umbraco site origin.
2. Set `VITE_UMBRACO_API_KEY` to a read-only Delivery API key.
3. Run `npm install`, then `npm run dev`.
4. Open the Replit web preview or `http://localhost:5000`.

In development, Vite proxies `/umbraco`, `/media`, `/video`, `/recipes`, and `/shop-online` to the configured Umbraco origin. Production browser requests go directly to `VITE_UMBRACO_BASE_URL`; enable CORS for the deployed site origin.

**Security:** `VITE_*` values are bundled into browser code. The current API client sends the Delivery API key from the browser, so only use a read-only key. For stronger protection, route requests through a server-side proxy.

## Project structure

- `src/api/deliveryApi.ts` — Delivery API requests and referenced item fetching.
- `src/api/homePageData.ts` — loads the homepage and enriches its category, product, and recipe references.
- `src/types/umbraco.ts` — shared Delivery API response types.
- `src/types/contentBlocks.ts` — homepage block types and the `ContentBlock` union.
- `src/types/contentTypes.ts` — category, product, recipe, and page content types.
- `src/components/cms-home/CmsHomePage.tsx` — renders supported homepage blocks in the order returned by Umbraco.
- `src/App.tsx` — request lifecycle, error/loading/empty states, and CMS SEO metadata.
- `src/utils/` — CMS link/media resolution and recipe time formatting.

## Homepage content

The renderer supports the homepage block types declared in `ContentBlock`: hero slider, categories, sticker strip, product/recipe sliders, promotion banners, image-and-copy blocks, social cards, and the store-finder block. Add new CMS blocks by defining the type in `src/types/contentBlocks.ts` and handling it in the renderer.

Product and recipe cards use the referenced IDs from the homepage and fetch full items individually. The recipe collection endpoint can fail when picker data is malformed, and the product catalog is too large to reliably find homepage references through fixed-size paging. When referenced items cannot be expanded, the page shows available CMS data and reports that some details could not be loaded.

Recipe time is displayed from the CMS `prepTime` and `cookTime` values. Product prices use Umbraco Commerce formatted values. Links to product, recipe, and category pages remain on the CMS site because those routes are not implemented in this SPA.

## Checks

- `npm run typecheck`
- `npm run build`
- `node scripts/check-content.mjs` checks recipe items referenced by the homepage.
- `node scripts/check-content.mjs --all` checks every `recipeDetail` item.

Some recipes may return HTTP 500 if multi-value picker fields such as `categories`, `timeToCook`, or `productType` contain a plain string instead of a JSON array. Correct those values in the Umbraco back office.
