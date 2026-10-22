import {
  getCollectionPageMap,
  getHomePage,
  getProductPageMap,
  getRecipeDetailMap,
} from './deliveryApi';
import type { HomePageItem } from '../types/contentBlocks';
import type { CollectionPage, ProductPage, RecipeDetail } from '../types/contentTypes';

export interface HomePageData {
  page: HomePageItem;
  collectionPages: Map<string, CollectionPage>;
  productPages: Map<string, ProductPage>;
  recipeDetails: Map<string, RecipeDetail>;
  warnings: string[];
}

type EnrichmentResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function collectReferences(page: HomePageItem) {
  const collections = new Set<string>();
  const products = new Set<string>();
  const recipes = new Set<string>();

  for (const { content: block } of page.properties.content?.items ?? []) {
    if (block.contentType === 'categoryContainer') {
      for (const category of block.properties.categories ?? []) {
        collections.add(category.id);
      }
    }

    if (block.contentType !== 'generalSliderContainer') continue;
    for (const { content: sliderItem } of block.properties.items?.items ?? []) {
      for (const product of sliderItem.properties.products ?? []) products.add(product.id);
      for (const recipe of sliderItem.properties.recipes ?? []) recipes.add(recipe.id);
    }
  }

  return {
    collectionIds: [...collections],
    productIds: [...products],
    recipeIds: [...recipes],
  };
}

function unwrap<T>(result: EnrichmentResult<T>, warnings: string[], label: string): T | undefined {
  if (result.status === 'fulfilled') return result.value;
  if (isAbortError(result.reason)) throw result.reason;
  warnings.push(label);
  return undefined;
}

/**
 * Loads the homepage and only the referenced content needed to render its blocks.
 * The Delivery API remains the source of every page, product, recipe and image.
 */
export async function getHomePageData(signal?: AbortSignal): Promise<HomePageData | null> {
  const page = await getHomePage(signal);
  if (!page) return null;

  const { collectionIds, productIds, recipeIds } = collectReferences(page);
  const emptyCollections = Promise.resolve(new Map<string, CollectionPage>());
  const emptyProducts = Promise.resolve({
    items: new Map<string, ProductPage>(),
    failures: [],
  });
  const emptyRecipes = Promise.resolve({
    items: new Map<string, RecipeDetail>(),
    failures: [],
  });

  const [collectionResult, productResult, recipeResult] = await Promise.all([
    (collectionIds.length ? getCollectionPageMap(signal) : emptyCollections).then(
      (value) => ({ status: 'fulfilled', value }) as const,
      (reason) => ({ status: 'rejected', reason }) as const,
    ),
    (productIds.length ? getProductPageMap(productIds, signal) : emptyProducts).then(
      (value) => ({ status: 'fulfilled', value }) as const,
      (reason) => ({ status: 'rejected', reason }) as const,
    ),
    (recipeIds.length ? getRecipeDetailMap(recipeIds, signal) : emptyRecipes).then(
      (value) => ({ status: 'fulfilled', value }) as const,
      (reason) => ({ status: 'rejected', reason }) as const,
    ),
  ]);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const warnings: string[] = [];
  const collectionPages =
    unwrap(collectionResult, warnings, 'Some category details could not be loaded.') ??
    new Map<string, CollectionPage>();
  const products =
    unwrap(productResult, warnings, 'Some product details could not be loaded.');
  const recipes =
    unwrap(recipeResult, warnings, 'Some recipe details could not be loaded.');

  if (products?.failures.length) warnings.push('Some product details could not be loaded.');
  if (recipes?.failures.length) warnings.push('Some recipe details could not be loaded.');

  return {
    page,
    collectionPages,
    productPages: products?.items ?? new Map<string, ProductPage>(),
    recipeDetails: recipes?.items ?? new Map<string, RecipeDetail>(),
    warnings: [...new Set(warnings)],
  };
}
