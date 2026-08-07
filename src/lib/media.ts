/**
 * Video URLs.
 *
 * Videos can't go through `image()` in the content schema, but we still want them
 * living in the trip's own folder rather than in `public/`. This glob hands every
 * video in the content tree to Vite, which emits it with a content-hashed URL and
 * the site `base` already applied.
 */
const VIDEO_URLS = import.meta.glob<string>('/src/content/trips/**/*.{mp4,webm,mov}', {
  query: '?url',
  import: 'default',
  eager: true,
});

/**
 * Resolves a manifest-relative video path against the trip it belongs to.
 *
 * @param slug Trip folder name.
 * @param src  Path as written in the manifest, e.g. "./media/descent.mp4".
 */
export function videoUrl(slug: string, src: string): string {
  const relative = src.replace(/^\.\//, '');
  const key = `/src/content/trips/${slug}/${relative}`;
  const url = VIDEO_URLS[key];

  if (!url) {
    throw new Error(
      `Video not found: "${src}" in src/content/trips/${slug}/manifest.json.\n` +
        `Looked for ${key}. Paths are relative to the manifest and must be .mp4, .webm or .mov.`,
    );
  }

  return url;
}

/** Animated GIFs are passed through unoptimised — sharp de-animates them on resize. */
export function isGif(src: { format?: string; src: string }): boolean {
  return src.format === 'gif' || src.src.toLowerCase().endsWith('.gif');
}
