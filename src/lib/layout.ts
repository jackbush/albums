/**
 * Row shapes for a `photos` block.
 *
 * A block holds one to six frames. The rows are fixed by the count — nothing in a
 * manifest chooses them — so the same number of photographs always lays out the same
 * way across albums. Within a row the frames are sized to a common height, so a row
 * of three reads as one band whatever mix of portrait and landscape it holds.
 *
 * One frame is the common case and falls out of the same rule: a single row of one,
 * which is the full column.
 *
 * A phone gets its own shapes: the same frames, but never more than two across, so
 * a band of three doesn't shrink to thumbnails on a narrow screen. An odd frame goes
 * last, closing the block full width rather than opening it.
 */
const ROWS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [3],
  4: [2, 2],
  5: [3, 2],
  6: [2, 2, 2],
};

const NARROW_ROWS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [2, 1],
  4: [2, 2],
  5: [2, 1, 2],
  6: [2, 2, 2],
};

/**
 * Frames per row, in order, for a block of `count` frames.
 *
 * With `hero` set, the first frame takes a row of its own at every width and the
 * rest fall into the shapes for one fewer frame — a hero block of four reads as one
 * full-width plate above a band of three, and on a phone as 1 + 2 + 1.
 *
 * `closer` does the same at the other end: the last frame takes a row of its own and
 * everything before it falls into the shapes for one fewer. So a closer block of
 * three is 2 + 1, and of four, 3 + 1.
 *
 * Set both and the block is bracketed — a plate, the shapes for the frames between,
 * then a plate. Four frames read 1 + 2 + 1; two read 1 + 1, one above the other.
 *
 * On a block of one neither flag changes anything: there is no rest to re-row.
 *
 * A hero block of two is the exception: on a wide screen the pair shares one row,
 * two thirds and one third, rather than stacking. A phone still stacks them — a
 * third of a phone column is the thumbnail the narrow shapes exist to avoid. Adding
 * `closer` overrides that, since asking for the last frame on its own is asking for
 * the two to stack.
 */
export function photoRows(
  count: number,
  variant: 'wide' | 'narrow' = 'wide',
  hero = false,
  closer = false,
): number[] {
  // A block with no frames has no rows. It never reaches here — the page skips it —
  // but returning a row for nothing would be a lie waiting to be believed.
  if (count === 0) return [];
  if (count === 1) return [1];

  if (hero && closer) {
    const between = count - 2;
    return [1, ...(between > 0 ? photoRows(between, variant) : []), 1];
  }
  if (closer) return [...photoRows(count - 1, variant), 1];

  if (hero && count === 2 && variant === 'wide') return [2];
  if (hero) return [1, ...photoRows(count - 1, variant)];

  const shapes = variant === 'narrow' ? NARROW_ROWS : ROWS;
  return shapes[count] ?? [count];
}
