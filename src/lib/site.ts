/**
 * Site-wide text — title, heading, description and share image — lives in
 * `src/albums/index.js`, next to the album list. Read it with `getSite()` from
 * `./posts`. This file is just the URL helper.
 */

/** Prefixes a path with the configured `base` so links work under /albums/. */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const suffix = path.replace(/^\//, '');
  return suffix ? `${base}/${suffix}` : `${base}/`;
}
