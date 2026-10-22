import type { ApiLink } from '../types/umbraco';
import { env } from '../config/env';
import { resolveAssetUrl } from './media';

export interface ResolvedLink {
  href: string;
  external: boolean;
}

export function firstLink(links: readonly ApiLink[] | null | undefined): ApiLink | undefined {
  return links?.[0];
}

/**
 * Content links carry their path in `route.path` (`url` is null).
 * External and media links carry a full `url`.
 */
export function resolveLink(link: ApiLink): ResolvedLink | null {
  const suffix = link.queryString ?? '';

  if (link.linkType === 'Content') {
    const path = link.route?.path ?? link.url;
    return path ? { href: `${path}${suffix}`, external: false } : null;
  }
  if (link.linkType === 'Media') {
    const url = resolveAssetUrl(link.url);
    return url ? { href: url, external: true } : null;
  }
  return link.url ? { href: `${link.url}${suffix}`, external: true } : null;
}

/**
 * Absolute URL of a content page, hosted by the CMS.
 *
 * The SPA currently implements the homepage only, so pages it does not own
 * yet (recipes, products, categories) still live on the CMS front-end. Cards
 * for those pages link here so the destination actually works.
 *
 * In development `env.origin` is empty and the request goes through the Vite
 * proxy (see `vite.config.ts`); in production it is the absolute CMS origin.
 *
 * When the matching React route is implemented, swap this for a react-router
 * `Link` to `route.path`.
 */
export function cmsContentUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.origin}${path.startsWith('/') ? '' : '/'}${path}`;
}
