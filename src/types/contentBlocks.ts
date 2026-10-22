import type {
  ApiLink,
  BlockContent,
  BlockList,
  ContentItemRoot,
  MediaItem,
} from './umbraco';
import type {
  CollectionPageItem,
  ProductPageItem,
  RecipeDetailItem,
} from './contentTypes';

/** Referenced content types are modelled in `./contentTypes` so the homepage can
 * compose cards from content it does not own (categories / products / recipes). */
export type { CollectionPageItem, ProductPageItem, RecipeDetailItem };

/*
 * Block definitions. Every interface mirrors a `contentType` found in
 * `properties.content.items[].content` of the supplied JSON.
 * Umbraco returns `null` (not `[]`) for empty media / link pickers, so those
 * fields are typed `T[] | null`.
 */

// ── headerSliderContainer ────────────────────────────────────────────────
export interface HeaderSliderItemProperties {
  useImage: boolean;
  image: MediaItem[] | null;
  imageAltText: string | null;
  videoUrl: string | null;
  videoAltText: string | null;
  titleOne: string;
  titleTwo: string;
  subTitle: string;
  useStickers: boolean;
  stickers: MediaItem[] | null;
  buttonOne: ApiLink[] | null;
  buttonTwo: ApiLink[] | null;
}
export type HeaderSliderItemContent = BlockContent<'headerSliderItem', HeaderSliderItemProperties>;

export interface HeaderSliderContainerProperties {
  items: BlockList<HeaderSliderItemContent>;
}
export type HeaderSliderContainerBlock = BlockContent<
  'headerSliderContainer',
  HeaderSliderContainerProperties
>;

// ── categoryContainer ────────────────────────────────────────────────────
// `CollectionPageItem` (categories) is re-exported from `./contentTypes` above.

export interface CategoryContainerProperties {
  titleOne: string;
  titleTwo: string;
  categories: CollectionPageItem[];
}
export type CategoryContainerBlock = BlockContent<'categoryContainer', CategoryContainerProperties>;

// ── stickerSliderContainer ───────────────────────────────────────────────
export interface StickerSliderItemProperties {
  sticker: MediaItem[];
  stickerAltText: string | null;
}
export type StickerSliderItemContent = BlockContent<'stickerSliderItem', StickerSliderItemProperties>;

export interface StickerSliderContainerProperties {
  stickers: BlockList<StickerSliderItemContent>;
}
export type StickerSliderContainerBlock = BlockContent<
  'stickerSliderContainer',
  StickerSliderContainerProperties
>;

// ── generalSliderContainer ───────────────────────────────────────────────
// `ProductPageItem` and `RecipeDetailItem` are re-exported from `./contentTypes` above.

/** Values observed in the response (across all pages; the homepage uses One/Two/Recipe One). */
export type GeneralSliderLayout =
  | 'Product Layout One'
  | 'Product Layout Two'
  | 'Product Layout Three'
  | 'Product Layout Four'
  | 'Recipe Layout One';

export interface GeneralSliderItemProperties {
  products: ProductPageItem[] | null;
  recipes: RecipeDetailItem[] | null;
  layout: GeneralSliderLayout;
}
export type GeneralSliderItemContent = BlockContent<'generalSliderItem', GeneralSliderItemProperties>;

export interface GeneralSliderContainerProperties {
  stickers: MediaItem[] | null;
  stickerAltText: string | null;
  titleOne: string;
  titleTwo: string;
  subTitle: string;
  button: ApiLink[] | null;
  items: BlockList<GeneralSliderItemContent>;
}
export type GeneralSliderContainerBlock = BlockContent<
  'generalSliderContainer',
  GeneralSliderContainerProperties
>;

// ── promotionBannerContainer ─────────────────────────────────────────────
export interface PromotionBannerItemProperties {
  /** Colours observed in the response ("Red" on the homepage, "Purple" on productsPage). */
  backgroundColour: 'Red' | 'Purple';
  image: MediaItem[] | null;
  imageAltText: string | null;
  mobileImage: MediaItem[] | null;
  mobileImageAltText: string | null;
}
export type PromotionBannerItemContent = BlockContent<
  'promotionBannerItem',
  PromotionBannerItemProperties
>;

export interface PromotionBannerContainerProperties {
  items: BlockList<PromotionBannerItemContent>;
}
export type PromotionBannerContainerBlock = BlockContent<
  'promotionBannerContainer',
  PromotionBannerContainerProperties
>;

// ── infoImageItemBlock ───────────────────────────────────────────────────
export interface InfoImageItemProperties {
  titleOne: string;
  titleTwo: string;
  subTitle: string;
  button: ApiLink[] | null;
  image: MediaItem[] | null;
  imageAltText: string | null;
  layout: 'Default Layout' | 'Recipe Layout';
}
export type InfoImageItemBlock = BlockContent<'infoImageItemBlock', InfoImageItemProperties>;

// ── socialEngagementCardContainer ────────────────────────────────────────
export interface SocialEngagementCardItemProperties {
  badge: string;
  titleOne: string;
  titleTwo: string;
  body: string;
  useStickers: boolean;
  sticker: MediaItem[] | null;
  useImage: boolean;
  image: MediaItem[] | null;
  imageAltText: string | null;
  videoUrl: string | null;
  videoAltText: string | null;
  button: ApiLink[] | null;
}
export type SocialEngagementCardItemContent = BlockContent<
  'socialEngagementCardItem',
  SocialEngagementCardItemProperties
>;

export interface SocialEngagementCardContainerProperties {
  items: BlockList<SocialEngagementCardItemContent>;
}
export type SocialEngagementCardContainerBlock = BlockContent<
  'socialEngagementCardContainer',
  SocialEngagementCardContainerProperties
>;

// ── findEskortBlock ──────────────────────────────────────────────────────
export interface FindEskortProperties {
  sticker: MediaItem[] | null;
  titleOne: string;
  titleTwo: string;
  buttonOne: ApiLink[] | null;
  buttonTwo: ApiLink[] | null;
  buttonThree: ApiLink[] | null;
}
export type FindEskortBlock = BlockContent<'findEskortBlock', FindEskortProperties>;

// ── Discriminated union, keyed on `contentType` ──────────────────────────
export type ContentBlock =
  | HeaderSliderContainerBlock
  | CategoryContainerBlock
  | StickerSliderContainerBlock
  | GeneralSliderContainerBlock
  | PromotionBannerContainerBlock
  | InfoImageItemBlock
  | SocialEngagementCardContainerBlock
  | FindEskortBlock;

export type ContentBlockType = ContentBlock['contentType'];
export type BlockOfType<TType extends ContentBlockType> = Extract<ContentBlock, { contentType: TType }>;

// ── homePage ─────────────────────────────────────────────────────────────
export interface HomePageProperties {
  searchEngineRelativePriority: { minimum: number; maximum: number };
  searchEngineChangeFrequency: string | null;
  hideFromXmlSitemap: boolean;
  content: BlockList<ContentBlock>;
  umbracoUrlName: string | null;
  umbracoUrlAlias: string | null;
  umbracoRedirect: string | null;
  rawMarkup: string | null;
  noIndex: boolean;
  noFollow: boolean;
  pageTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonicalTag: string;
  openGraphTitle: string;
  openGraphDescription: string;
  openGraphImage: MediaItem[] | null;
  openGraphType: string;
  openGraphSiteName: string;
  openGraphUrl: string;
  openGraphLocale: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: MediaItem[] | null;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
  siteName: string;
  siteDescription: string;
  store: { alias: string; id: string };
  /** `null` in the supplied response; shape unknown. */
  siteFooterLinks: unknown;
  siteRawMarkup: string | null;
}

export type HomePageItem = ContentItemRoot<'homePage', HomePageProperties>;
