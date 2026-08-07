/** Site-wide text. Edit these two lines to rename the site. */
export const SITE = {
  /** Shown as the home page heading and as the back link on every album page. */
  title: 'Albums',
  /** Not shown on the page — this is the meta description search results use. */
  tagline: 'Photo albums from trips and elsewhere.',
} as const;

/** Prefixes a path with the configured `base` so links work under /albums/. */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const suffix = path.replace(/^\//, '');
  return suffix ? `${base}/${suffix}` : `${base}/`;
}
