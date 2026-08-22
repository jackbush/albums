/**
 * Row shapes for a `group` block.
 *
 * A group holds two to six frames. The rows are fixed by the count — nothing in a
 * manifest chooses them — so the same number of photographs always lays out the same
 * way across albums. Within a row the frames are sized to a common height, so a row
 * of three reads as one band whatever mix of portrait and landscape it holds.
 */
const ROWS: Record<number, number[]> = {
  2: [2],
  3: [3],
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
};

/** Frames per row, in order, for a group of `count` frames. */
export function groupRows(count: number): number[] {
  return ROWS[count] ?? [count];
}
