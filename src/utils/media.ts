import type { CSSProperties } from 'react';
import { env } from '../config/env';
import type { MediaItem } from '../types/umbraco';

/** Turns an Umbraco-relative path (`/media/...`, `/video/...`) into a loadable URL. */
export function resolveAssetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Media pickers return arrays (or null); most blocks use only the first item. */
export function firstMedia(items: readonly MediaItem[] | null | undefined): MediaItem | undefined {
  return items?.[0];
}

/** Honour the focal point set in the Umbraco media library when cropping with object-fit. */
export function focalPointStyle(media: MediaItem): CSSProperties | undefined {
  if (!media.focalPoint) return undefined;
  const { left, top } = media.focalPoint;
  return { objectPosition: `${left * 100}% ${top * 100}%` };
}
