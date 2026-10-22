import type {
  BlockContent,
  BlockList,
  ContentItem,
  ContentItemRoot,
  MediaItem,
} from './umbraco';

/**
 * Catalog of every `contentType` discovered in the Umbraco Delivery API response
 * (the full-content dump was used as the source of truth).
 *
 * The `homePage` node owns the homepage's *block layout* — all 11 blocks are
 * nested under `properties.content.items` (modelled in `contentBlocks.ts`).
 * But the homepage is a composition layer: the cards it shows are content owned
 * by other content types (`collectionPage`, `productPage`, `recipeDetail`),
 * which arrive inline as shells with `properties: {}`. Those referenced types
 * are modelled here with full, all-optional properties so the same interface
 * describes both the inline shell and the fully-fetched node.
 *
 * Page-level `content` block lists mix block types that are modelled in
 * `contentBlocks.ts`; to avoid a circular import those lists are typed loose
 * here (`LooseBlockList`). The block types rendered on the homepage keep their
 * strict interfaces in `contentBlocks.ts`.
 */

// ── Shared SEO fragment ─────────────────────────────────────────────────
/** SEO / URL properties present (as null or a value) on most page types. */
export interface SeoProperties {
  searchEngineRelativePriority?: { minimum: number; maximum: number } | null;
  searchEngineChangeFrequency?: string | null;
  hideFromXmlSitemap?: boolean | null;
  umbracoUrlName?: string | null;
  umbracoUrlAlias?: string | null;
  umbracoRedirect?: string | null;
  rawMarkup?: string | null;
  noIndex?: boolean | null;
  noFollow?: boolean | null;
  pageTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  canonicalTag?: string | null;
  openGraphTitle?: string | null;
  openGraphDescription?: string | null;
  openGraphImage?: MediaItem[] | null;
  openGraphType?: string | null;
  openGraphSiteName?: string | null;
  openGraphUrl?: string | null;
  openGraphLocale?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: MediaItem[] | null;
  twitterCard?: string | null;
  twitterSite?: string | null;
  twitterCreator?: string | null;
}

/** Known `destinationType` values found on `ApiLink` (nodes themselves were not
 * all in the dump; `ApiLink.destinationType` stays `string | null`). */
export type KnownDestinationType = 'productsPage' | 'aboutUs' | 'recipes' | 'storesLanding';

// ── Referenced content types (composed onto the homepage) ───────────────

/**
 * `collectionPage` — a shop category. On the homepage it appears inside
 * `categoryContainer.categories` and (via `additionalCategories`) inside
 * product pickers. Inline shells carry `properties: {}`; the full node carries
 * a `logo`, so every field is optional.
 */
export interface CollectionPageProperties extends SeoProperties {
  image?: MediaItem[] | null;
  description?: string | null;
  logo?: MediaItem[] | null;
  logoAltText?: string | null;
  productGroupId?: string | null;
  imagesCredit?: string | null;
  redirectUrl?: string | null;
}
export type CollectionPageItem = ContentItem<'collectionPage', CollectionPageProperties>;
export type CollectionPage = ContentItemRoot<'collectionPage', CollectionPageProperties>;

export interface ProductMeasurements {
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
}

/**
 * Umbraco Commerce money value. The formatted strings are what the CMS
 * front-end renders, e.g. "R149,99".
 */
export interface MoneyValue {
  currency: { code: string; id: string } | null;
  withoutTax: number | null;
  tax: number | null;
  withTax: number | null;
  formatted: {
    withoutTax: string | null;
    tax: string | null;
    withTax: string | null;
  } | null;
}

/**
 * `productPage` — a product. On the homepage it appears inside
 * `generalSliderItem.products` and `featuredRecipeContainer.products`. Inline
 * shells carry `properties: {}`; the full node carries sku / price /
 * measurements / images (all optional).
 */
export interface ProductPageProperties extends SeoProperties {
  sku?: string | null;
  price?: MoneyValue | null;
  salePrice?: MoneyValue | null;
  measurements?: ProductMeasurements | null;
  content?: LooseBlockList | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  images?: MediaItem[] | null;
  infoAccordion?: unknown;
  promoImage?: MediaItem[] | null;
  isGiftCard?: boolean | null;
  pricingFilters?: unknown;
  preparationFilters?: unknown;
  promoImageAltText?: string | null;
  featuredRecipe?: unknown;
  additionalCategories?: CollectionPageItem[] | null;
}
export type ProductPageItem = ContentItem<'productPage', ProductPageProperties>;
export type ProductPage = ContentItemRoot<'productPage', ProductPageProperties>;

/** Rich text (and "markup + blocks") property shape returned by the Delivery API. */
export interface RichTextValue {
  markup: string;
  blocks: unknown[];
}

/**
 * `recipeDetail` — a recipe. On the homepage it appears inside
 * `generalSliderItem.recipes`. The inline shell carries `properties: {}`.
 *
 * The full node (fetched with `expand=properties`) carries `headerImage`,
 * `headerImageAltText`, `videoUrl`, `cookTime`, `prepTime`, `serves`, … — the
 * names below were read from the live Delivery API response, not guessed.
 * All are optional so the same type covers both the shell and the enriched
 * node.
 */
export interface RecipeDetailProperties {
  /** Recipe headline (same value as the node `name` in the current content). */
  title?: string | null;
  subTitle?: string | null;
  /** Intro copy. */
  body?: RichTextValue | null;
  /** Primary card image — the property the CMS front-end renders. */
  headerImage?: MediaItem[] | null;
  /** Portrait variant of the header image. */
  headerImageMobile?: MediaItem[] | null;
  headerImageAltText?: string | null;
  /** When set, the CMS front-end renders a looping video instead of the image. */
  videoUrl?: string | null;
  audioUrl?: string | null;
  author?: string | null;
  /** Multi-value picker — stored as a JSON array of plain strings. */
  categories?: string[] | null;
  /** Multi-value picker — stored as a JSON array of plain strings. */
  timeToCook?: string[] | null;
  /** Multi-value picker — stored as a JSON array of plain strings. */
  productType?: string[] | null;
  /** Cooking time, e.g. "20min". */
  cookTime?: string | null;
  /** Preparation time, e.g. "10min". */
  prepTime?: string | null;
  /** Portions, e.g. "4" or "4-6". */
  serves?: string | null;
  ingredients?: RichTextValue | null;
  method?: RichTextValue | null;
  serve?: RichTextValue | null;
  nutritions?: RichTextValue | null;
  content?: LooseBlockList | null;
  [key: string]: unknown;
}
export type RecipeDetailItem = ContentItem<'recipeDetail', RecipeDetailProperties>;
export type RecipeDetail = ContentItemRoot<'recipeDetail', RecipeDetailProperties>;

// ── Additional block types (not on the homepage, but discovered) ─────────

/** `headerContainer` — page hero (categoriesPage, productsPage). */
export interface HeaderContainerProperties {
  titleOne: string;
  titleTwo: string;
  subTitle: string;
  image: MediaItem[] | null;
  imageAltText: string | null;
  mobileImage: MediaItem[] | null;
  mobileImageAltText: string | null;
  useStickers: boolean;
  backgroundColour: string | null;
}
export type HeaderContainerBlock = BlockContent<'headerContainer', HeaderContainerProperties>;

/** `categoryProductsSection` — placeholder on categoriesPage; empty in the dump. */
export interface CategoryProductsSectionProperties {}
export type CategoryProductsSectionBlock = BlockContent<
  'categoryProductsSection',
  CategoryProductsSectionProperties
>;

/** `featuredRecipeContainer` — product grid on productsPage. */
export interface FeaturedRecipeContainerProperties {
  products: ProductPageItem[];
}
export type FeaturedRecipeContainerBlock = BlockContent<
  'featuredRecipeContainer',
  FeaturedRecipeContainerProperties
>;

/** `locationEditSection` — intro block on locationEdit. */
export interface LocationEditSectionProperties {
  title: string;
  subTitle: string;
}
export type LocationEditSectionBlock = BlockContent<'locationEditSection', LocationEditSectionProperties>;

// ── Page-level content types ────────────────────────────────────────────

/** `checkoutSettings` — only `content` (a findEskortBlock) is present in the dump. */
export interface CheckoutSettingsProperties {
  content: LooseBlockList;
}
export type CheckoutSettings = ContentItemRoot<'checkoutSettings', CheckoutSettingsProperties>;

/** `locationEdit` — location picker page. */
export interface LocationEditProperties extends SeoProperties {
  content: LooseBlockList;
  showInNav: boolean;
  showInSubNav: boolean;
  showInFooter: boolean;
}
export type LocationEdit = ContentItemRoot<'locationEdit', LocationEditProperties>;

/** `categoriesPage` — shop landing. */
export interface CategoriesPageProperties extends SeoProperties {
  content: LooseBlockList;
  productCategories: CollectionPageItem[];
}
export type CategoriesPage = ContentItemRoot<'categoriesPage', CategoriesPageProperties>;

/** `productsPage` — shop-online landing. */
export interface ProductsPageProperties extends SeoProperties {
  content: LooseBlockList;
  image: MediaItem[] | null;
  description: string | null;
  logo: MediaItem[] | null;
  logoAltText: string | null;
  productGroupId: string | null;
}
export type ProductsPage = ContentItemRoot<'productsPage', ProductsPageProperties>;

// ── Loose block list (for page-level `content`) ──────────────────────────

/** A block-list entry whose block type is not typed here. Page-level `content`
 * lists mix block types modelled in `contentBlocks.ts`; kept loose to avoid a
 * circular import. */
export type LooseBlockContent = BlockContent<string, Record<string, unknown>>;
export type LooseBlockList = BlockList<LooseBlockContent>;

// ── Catalogue of every discovered contentType ────────────────────────────

/** Every `contentType` string observed in the supplied JSON. */
export type DiscoveredContentType =
  // Page-level content types
  | 'homePage'
  | 'checkoutSettings'
  | 'locationEdit'
  | 'categoriesPage'
  | 'productsPage'
  | 'collectionPage'
  | 'productPage'
  | 'recipeDetail'
  // Block content types (nested in `content.items`)
  | 'headerSliderContainer'
  | 'headerSliderItem'
  | 'categoryContainer'
  | 'stickerSliderContainer'
  | 'stickerSliderItem'
  | 'generalSliderContainer'
  | 'generalSliderItem'
  | 'promotionBannerContainer'
  | 'promotionBannerItem'
  | 'infoImageItemBlock'
  | 'socialEngagementCardContainer'
  | 'socialEngagementCardItem'
  | 'findEskortBlock'
  | 'headerContainer'
  | 'categoryProductsSection'
  | 'featuredRecipeContainer'
  | 'locationEditSection';

/** Content types that appear on the homepage, split by how they are rendered. */
export type HomepageBlockContentType =
  | 'headerSliderContainer'
  | 'headerSliderItem'
  | 'categoryContainer'
  | 'stickerSliderContainer'
  | 'stickerSliderItem'
  | 'generalSliderContainer'
  | 'generalSliderItem'
  | 'promotionBannerContainer'
  | 'promotionBannerItem'
  | 'infoImageItemBlock'
  | 'socialEngagementCardContainer'
  | 'socialEngagementCardItem'
  | 'findEskortBlock';

/** Referenced content types composed onto the homepage via content pickers. */
export type HomepageReferencedContentType = 'collectionPage' | 'productPage' | 'recipeDetail';
