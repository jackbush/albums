/*
 * Media resolution.
 *
 * Manifests reference media as paths relative to themselves ("./media/x.jpg").
 * These globs hand every file in the content tree to Vite, which gives images their
 * `ImageMetadata` (dimensions included, so the build can resize them) and videos a
 * content-hashed URL with the site `base` already applied. That's what lets media
 * stay in the album's own folder rather than in `public/`.
 */

const IMAGES = import.meta.glob<ImageMetadata>(
  '/src/albums/**/*.{jpg,jpeg,png,gif,webp,avif}',
  { eager: true, import: 'default' },
);

const VIDEOS = import.meta.glob<string>('/src/albums/**/*.{mp4,webm,mov}', {
  query: '?url',
  import: 'default',
  eager: true,
});

function keyFor(slug: string, src: string): string {
  return `/src/albums/${slug}/${src.replace(/^\.\//, '')}`;
}

function missing(kind: string, slug: string, src: string, key: string, allowed: string): never {
  throw new Error(
    `${kind} not found: "${src}" in src/albums/${slug}/manifest.js.\n` +
      `  Looked for ${key}\n` +
      `  Paths are relative to the manifest and must be ${allowed}.`,
  );
}

/** Resolves a manifest-relative image path, e.g. "./media/cliffs.jpg". */
export function resolveImage(slug: string, src: string): ImageMetadata {
  const key = keyFor(slug, src);
  return IMAGES[key] ?? missing('Image', slug, src, key, '.jpg, .png or .gif');
}

/**
 * Resolves an image path written in `src/albums/index.js`, e.g. "./home-cover.jpg".
 *
 * Same rules as an album's media, one level up: relative to the file it's written in.
 */
export function resolveSiteImage(src: string): ImageMetadata {
  const key = `/src/albums/${src.replace(/^\.\//, '')}`;
  const image = IMAGES[key];
  if (!image) {
    throw new Error(
      `Image not found: "${src}" in src/albums/index.js.\n` +
        `  Looked for ${key}\n` +
        `  Paths are relative to src/albums/index.js and must be .jpg, .png or .gif.`,
    );
  }
  return image;
}

/** Resolves a manifest-relative video path, e.g. "./media/descent.mp4". */
export function resolveVideo(slug: string, src: string): string {
  const key = keyFor(slug, src);
  return VIDEOS[key] ?? missing('Video', slug, src, key, '.mp4, .webm or .mov');
}

/** Animated GIFs are passed through unoptimised — sharp de-animates them on resize. */
export function isGif(src: ImageMetadata): boolean {
  return src.format === 'gif' || src.src.toLowerCase().endsWith('.gif');
}
