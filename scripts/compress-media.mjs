/*
 * Downsamples album sources to the largest size the site ever actually serves.
 *
 * The biggest image any visitor receives is the lightbox plate from `fullPlate`
 * in src/lib/media.ts, which fits the photograph inside a PLATE_CAP box. Every
 * inline rung is smaller (the widest is 2336, in PhotosItem). So a source beyond
 * the plate cap carries pixels that are resized away on every build and never
 * reach anyone.
 *
 * Two things this gets right that a one-line `sips` loop wouldn't:
 *
 *   - It fits each image inside a square box rather than clamping one axis, which
 *     is what `fullPlate` does. Scaling by the long edge keeps both orientations
 *     on the same budget: a 3:2 landscape lands at 2400x1600 and a 2:3 upright at
 *     1600x2400, where clamping width alone would have kept the upright at
 *     2400x3600 — 2.25x the pixels, for a plate no screen is tall enough to show.
 *   - It keeps EXIF. `DateTimeOriginal` is the spine of every manifest — day
 *     boundaries, block order, the `year` field — so a pass that stripped it
 *     would leave the album unregenerable.
 *
 * Lossy and irreversible: it overwrites the source. Keep true originals outside
 * the repo.
 *
 * Usage:
 *   npm run compress                    # every album
 *   npm run compress -- 2026-orchids    # named albums only
 *   npm run compress -- --dry-run       # report, change nothing
 *   npm run compress -- --yes           # skip the confirmation
 */

import { createInterface } from 'node:readline/promises';
import { readdir, readFile, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ALBUMS = 'src/albums';

/* Re-encode quality. These files are masters that the build re-encodes to webp
 * and avif, so this sits high enough that the second pass isn't compounding
 * artefacts from the first. */
const QUALITY = 85;

/* sharp de-animates a GIF on resize, keeping frame one and dropping the rest —
 * which is why `fullPlate` passes them through untouched too. */
const RESIZABLE = new Set(['.jpg', '.jpeg', '.png']);

/**
 * The plate cap, read out of media.ts rather than copied.
 *
 * A number duplicated here would go stale the day someone changes the lightbox,
 * and the failure is silent and destructive: the compressor would keep cutting
 * sources to a cap the site had already moved past. Reading it means a change
 * there either flows through or stops this script with an error.
 */
async function plateCap() {
  const file = 'src/lib/media.ts';
  const source = await readFile(file, 'utf8');
  const match = source.match(/export const PLATE_CAP\s*=\s*(\d+)\s*;/);
  if (!match) {
    throw new Error(
      `Couldn't find PLATE_CAP in ${file}.\n` +
        `  Expected something of the form: export const PLATE_CAP = 2400;\n` +
        `  If fullPlate has been rewritten, update the pattern in ${import.meta.url}.`,
    );
  }
  return Number(match[1]);
}

const bytes = (n) => `${(n / 1e6).toFixed(1)} MB`;

async function albumsToScan(named) {
  const all = (await readdir(ALBUMS, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  if (named.length === 0) return all;

  const unknown = named.filter((n) => !all.includes(n));
  if (unknown.length > 0) {
    throw new Error(`No such album: ${unknown.join(', ')}\n  Available: ${all.join(', ')}`);
  }
  return named;
}

/** Every image under an album, at any depth — media/ and b-roll/ alike. */
async function imagesIn(album) {
  const found = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // an album folder with no media yet
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (RESIZABLE.has(path.extname(entry.name).toLowerCase())) found.push(full);
    }
  }
  await walk(path.join(ALBUMS, album));
  return found.sort();
}

/**
 * Rewrites one file in place, via a temp file so an interrupted run can't leave
 * a half-written photograph where the original was.
 *
 * Returns null when there's nothing worth doing: already within the cap, or the
 * re-encode came out no smaller than what's already on disk.
 */
async function shrink(file, cap, dryRun) {
  const image = sharp(file, { failOn: 'error' });
  const { width, height, format } = await image.metadata();
  const before = (await stat(file)).size;

  if (!width || !height) throw new Error(`Couldn't read the dimensions of ${file}`);

  /* The same fit `fullPlate` performs: whichever edge is longer decides the
   * scale, so the image lands inside a cap-by-cap box either way up.
   *
   * `fit: 'inside'` rather than a scale computed here and passed as a width:
   * rounding the second edge up can overshoot the cap by a pixel, which is
   * invisible on the page but leaves the file looking oversized to the next run,
   * so every pass would re-encode it and stack up generation loss. */
  if (Math.max(width, height) <= cap) return null;

  const scale = Math.min(cap / width, cap / height);
  const target = Math.floor(width * scale);
  const scaled = Math.floor(height * scale);
  if (dryRun) return { before, after: null, width, height, target, scaled };

  const temp = `${file}.compressing`;
  try {
    await image
      .resize({ width: cap, height: cap, fit: 'inside', withoutEnlargement: true })
      .keepMetadata()
      .toFormat(format === 'png' ? 'png' : 'jpeg', format === 'png' ? {} : { quality: QUALITY, mozjpeg: true })
      .toFile(temp);

    const after = (await stat(temp)).size;
    /* A source already tighter than what we'd produce is left alone — no point
     * spending a re-encode, and its own generation loss, to grow the file. */
    if (after >= before) {
      await unlink(temp);
      return null;
    }
    await rename(temp, file);
    return { before, after, width, height, target, scaled };
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}

async function confirm(count, totalBefore) {
  if (!process.stdin.isTTY) {
    console.error('\nRefusing to overwrite without confirmation. Re-run with --yes (or --dry-run).');
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nOverwrite ${count} files (${bytes(totalBefore)})? [y/N] `);
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log('Nothing changed.');
    process.exit(0);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const assumeYes = args.includes('--yes');
  const named = args.filter((a) => !a.startsWith('--'));

  const cap = await plateCap();
  const albums = await albumsToScan(named);

  console.log(`Plate cap is ${cap}px on the long edge (src/lib/media.ts). Anything beyond it is never served.\n`);

  /* Surveyed up front so the confirmation can state the real damage, and so a
   * dry run and a live run walk exactly the same list. */
  const work = [];
  let skipped = 0;
  for (const album of albums) {
    for (const file of await imagesIn(album)) {
      const { width, height } = await sharp(file).metadata();
      if (Math.max(width, height) > cap) work.push({ album, file });
      else skipped++;
    }
  }

  if (work.length === 0) {
    console.log(`Nothing to do — all ${skipped} images are already within the cap.`);
    return;
  }

  let totalBefore = 0;
  for (const { file } of work) totalBefore += (await stat(file)).size;

  console.log(`${work.length} oversized, ${skipped} already within the cap.`);
  if (!dryRun && !assumeYes) await confirm(work.length, totalBefore);

  let before = 0;
  let after = 0;
  let changed = 0;
  let album = null;

  for (const item of work) {
    if (item.album !== album) {
      album = item.album;
      console.log(`\n${album}`);
    }
    const result = await shrink(item.file, cap, dryRun);
    if (!result) continue;

    changed++;
    before += result.before;
    after += result.after ?? result.before;
    const name = path.basename(item.file);
    const size = dryRun
      ? `${bytes(result.before)} → ?`
      : `${bytes(result.before)} → ${bytes(result.after)}`;
    console.log(
      `  ${dryRun ? 'would resize' : 'resized'} ${name}  ` +
        `${result.width}x${result.height} → ${result.target}x${result.scaled}  ${size}`,
    );
  }

  console.log(`\n${dryRun ? 'Would rewrite' : 'Rewrote'} ${changed} file${changed === 1 ? '' : 's'}.`);
  if (!dryRun) {
    console.log(`${bytes(before)} → ${bytes(after)}  (${((1 - after / before) * 100).toFixed(1)}% smaller)`);
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
