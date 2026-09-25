/**
 * The block marker printed beside a caption, for blocks that don't hold photographs.
 *
 * A block is one entry in a manifest's `items` array, and its position there is how
 * you'd name it when asking for it to be moved, cut or merged — so that number is
 * what the marker shows, counting every block including the photo ones.
 *
 * The marker is always in the HTML and always hidden; debug mode reveals it. Photos
 * blocks carry `data-block` instead and are annotated per frame — see
 * `components/DebugMode.astro`.
 */
export function blockMarker(block: number): string {
  return `[${block}]`;
}
