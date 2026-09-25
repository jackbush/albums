/*
 * Media resolution.
 *
 * Manifests reference media as paths relative to themselves ("./media/x.jpg").
 * These globs hand every file in the content tree to Vite, which gives images their
 * `ImageMetadata` (dimensions included, so the build can resize them) and videos a
 * content-hashed URL with the site `base` already applied. That's what lets media
 * stay in the album's own folder rather than in `public/`.
 */

import { getImage } from 'astro:assets';

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

export interface Plate {
  src: string;
  width: number;
  height: number;
}

/**
 * The longest edge of a lightbox plate. Not a measurement of any screen — the
 * lightbox is `object-fit: contain` in a full-viewport stage, and a 5K display
 * could use more than this for a landscape — but the budget the site is willing
 * to spend on one photograph.
 *
 * It applies to the long edge rather than to width so that both orientations are
 * held to the same standard. Capping width alone gave a landscape 2400 along its
 * long edge and an upright 3600 along its own, which no mainstream screen is tall
 * enough to show: 2880 is about the ceiling, on a 27-inch 5K panel or a phone at
 * DPR 3.
 */
export const PLATE_CAP = 2400;

/**
 * The full-size version the lightbox loads, fitted inside a PLATE_CAP box.
 *
 * Animated GIFs bypass sharp entirely — resizing one drops every frame but the
 * first — and still get a hashed URL from the import.
 */
export async function fullPlate(src: ImageMetadata): Promise<Plate> {
  const scale = Math.min(1, PLATE_CAP / src.width, PLATE_CAP / src.height);
  const width = isGif(src) ? src.width : Math.round(src.width * scale);
  const height = isGif(src) ? src.height : Math.round(src.height * scale);
  return {
    src: isGif(src) ? src.src : (await getImage({ src, width, format: 'webp', quality: 82 })).src,
    width,
    height,
  };
}
