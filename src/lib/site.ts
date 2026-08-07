/** Site-wide text. Edit these two lines to rename the site. */
export const SITE = {
  title: 'Trips',
  tagline: 'Photographs, by trip.',
} as const;

/** Prefixes a path with the configured `base` so links work under /gallery/. */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const suffix = path.replace(/^\//, '');
  return suffix ? `${base}/${suffix}` : `${base}/`;
}
