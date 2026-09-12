/**
 * Row shapes for a `group` block.
 *
 * A group holds two to six frames. The rows are fixed by the count — nothing in a
 * manifest chooses them — so the same number of photographs always lays out the same
 * way across albums. Within a row the frames are sized to a common height, so a row
 * of three reads as one band whatever mix of portrait and landscape it holds.
 *
 * A phone gets its own shapes: the same frames, but never more than two across, so
 * a band of three doesn't shrink to thumbnails on a narrow screen.
 */
const ROWS: Record<number, number[]> = {
  2: [2],
  3: [3],
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
};

const NARROW_ROWS: Record<number, number[]> = {
  2: [2],
  3: [1, 2],
  4: [2, 2],
  5: [2, 1, 2],
  6: [2, 2, 2],
};

/**
 * Frames per row, in order, for a group of `count` frames.
 *
 * With `hero` set, the first frame takes a row of its own at every width and the
 * rest fall into the shapes for one fewer frame — a hero group of four reads as one
 * full-width plate above a band of three.
 */
export function groupRows(
  count: number,
  variant: 'wide' | 'narrow' = 'wide',
  hero = false,
): number[] {
  if (hero) return [1, ...(count > 1 ? groupRows(count - 1, variant) : [])];

  const shapes = variant === 'narrow' ? NARROW_ROWS : ROWS;
  return shapes[count] ?? [count];
}
