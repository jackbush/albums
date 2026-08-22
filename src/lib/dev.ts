/**
 * The block marker printed beside a caption while the dev server is running.
 *
 * A block is one entry in a manifest's `items` array, and its position there is how
 * you'd name it when asking for it to be moved, cut or merged — so that number is
 * what the marker shows, counting every block including the text ones.
 *
 * Vite replaces `import.meta.env.DEV` with a literal, so `astro build` folds this to
 * `null` and the marker never reaches the published site.
 */
export function blockMarker(block: number): string | null {
  return import.meta.env.DEV ? `[${block}]` : null;
}
