/**
 * Shared Umbraco Delivery API v2 shapes.
 * Modelled on the real response of:
 *   GET /umbraco/delivery/api/v2/content?filter=contentType:homePage&expand=properties[content]
 * Field names match the JSON exactly (the JSON is already camelCase).
 */

export interface DeliveryListResponse<TItem> {
  total: number;
  items: TItem[];
}

export interface StartItem {
  id: string;
  path: string;
}

export interface ContentRoute {
  path: string;
  queryString: string | null;
  startItem: StartItem;
}

export interface FocalPoint {
  /** 0..1 from the left edge */
  left: number;
  /** 0..1 from the top edge */
  top: number;
}

export interface MediaItem {
  /** `null` when no focal point has been set in the media library */
  focalPoint: FocalPoint | null;
  /** Always `[]` in the supplied response; shape of a crop was not observed. */
  crops: readonly unknown[];
  id: string;
  name: string;
  mediaType: string;
  /** Path relative to the Umbraco origin, e.g. `/media/ldrh0ipu/rectangle-17.png` */
  url: string;
  extension: string;
  width: number;
  height: number;
  bytes: number;
  properties: Record<string, unknown>;
}

/** Umbraco link types. The response only contained "Content". */
export type LinkType = 'Content' | 'Media' | 'External';

export interface ApiLink {
  /** `null` for content links; the route carries the path instead */
  url: string | null;
  queryString: string | null;
  title: string;
  target: string | null;
  destinationId: string | null;
  destinationType: string | null;
  route: ContentRoute | null;
  linkType: LinkType;
  culture: string | null;
}

/**
 * A routable content item (page). Items nested inside blocks come back with
 * `properties: {}` unless the request expands them further.
 */
export interface ContentItem<TType extends string, TProperties = Record<string, unknown>> {
  contentType: TType;
  name: string;
  createDate: string;
  updateDate: string;
  route: ContentRoute;
  id: string;
  properties: TProperties;
}

/** The inner `content` object of a block list / block grid entry. */
export interface BlockContent<TType extends string, TProperties> {
  contentType: TType;
  id: string;
  properties: TProperties;
}

/** One entry of a block list: `{ content, settings }`. */
export interface BlockItem<TContent> {
  content: TContent;
  /** Always `null` in the supplied response. */
  settings: Record<string, unknown> | null;
}

export interface BlockList<TContent> {
  items: BlockItem<TContent>[];
}

/** Top-level items from the list endpoint additionally carry `cultures`. */
export interface ContentItemRoot<TType extends string, TProperties>
  extends ContentItem<TType, TProperties> {
  cultures: Record<string, unknown>;
}
