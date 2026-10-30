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
 * Videos get the same treatment against a web-ready target: H.264 in an mp4, no
 * larger than 1080p, around 2 Mbps. A clip already there is left alone, so a re-run
 * doesn't stack up generation loss; anything else — a phone's .mov, HEVC, HDR, 4K, a
 * camera's 10 Mbps — is re-encoded. A .mov comes out as an .mp4 beside it, and the
 * album's manifest is repointed to match. Needs ffmpeg; HDR also needs macOS.
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

import { execFile } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { access, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { rewrite } from './lib/manifest.mjs';

const run = promisify(execFile);

const ALBUMS = 'src/albums';

/* Re-encode quality. These files are masters that the build re-encodes to webp
 * and avif, so this sits high enough that the second pass isn't compounding
 * artefacts from the first. */
const QUALITY = 85;

/* sharp de-animates a GIF on resize, keeping frame one and dropping the rest —
 * which is why `fullPlate` passes them through untouched too. */
const RESIZABLE = new Set(['.jpg', '.jpeg', '.png']);

/* What a phone or camera hands over. WebM is left alone: nobody exports one by
 * accident, so one in an album was made for the web already. */
const VIDEOS = new Set(['.mov', '.mp4', '.m4v']);

/* The web-ready target. `ceiling` is what counts as already there: the encode below
 * peaks at `maxrate` plus the audio, so its own output always lands under it. */
const VIDEO = {
  long: 1920,
  short: 1080,
  crf: 24,
  maxrate: '2.5M',
  bufsize: '5M',
  audio: '128k',
  ceiling: 3.5e6,
};

/* HLG and PQ: an iPhone's HDR. Squeezed straight into 8-bit SDR it comes out
 * washed-out and grey, so it's tone-mapped first. */
const HDR = new Set(['arib-std-b67', 'smpte2084']);

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

/** Every file under an album with one of `extensions`, at any depth — media/ and b-roll/ alike. */
async function filesIn(album, extensions) {
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
      else if (extensions.has(path.extname(entry.name).toLowerCase())) found.push(full);
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

/** Dimensions as shown (a phone's portrait clip is stored landscape and flagged), codec, HDR, bitrate. */
async function probe(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file,
  ]);
  const { streams, format } = JSON.parse(stdout);
  const video = streams.find((s) => s.codec_type === 'video');
  if (!video) throw new Error(`No video stream in ${file}`);

  const rotation = video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0;
  const sideways = Math.abs(Number(rotation)) % 180 === 90;
  return {
    width: sideways ? video.height : video.width,
    height: sideways ? video.width : video.height,
    codec: video.codec_name,
    hdr: HDR.has(video.color_transfer),
    bitrate: Number(format.bit_rate),
  };
}

/** Why a clip isn't web-ready yet — empty when it is. */
function videoProblems(file, { width, height, codec, hdr, bitrate }) {
  const problems = [];
  if (path.extname(file).toLowerCase() !== '.mp4') problems.push(path.extname(file).slice(1));
  if (codec !== 'h264') problems.push(codec);
  if (hdr) problems.push('HDR');
  if (Math.max(width, height) > VIDEO.long || Math.min(width, height) > VIDEO.short) {
    problems.push(`${width}x${height}`);
  }
  if (bitrate > VIDEO.ceiling) problems.push(`${(bitrate / 1e6).toFixed(1)} Mbps`);
  return problems;
}

const exists = (file) => access(file).then(() => true, () => false);

/**
 * Re-encodes one clip to the target, as an .mp4 beside the source, then replaces it.
 *
 * Returns null when a clip that was only over the bitrate ceiling comes out no
 * smaller — the same rule `shrink` applies to photographs. A clip in the wrong
 * container or codec is converted whatever the size, since that's about whether it
 * plays at all.
 */
async function transcode(item) {
  const { file, album, problems } = item;
  const target = path.join(path.dirname(file), `${path.basename(file, path.extname(file))}.mp4`);
  if (target !== file && (await exists(target))) {
    throw new Error(`${target} already exists, so ${path.basename(file)} has nowhere to go. Move one aside.`);
  }

  const before = (await stat(file)).size;
  const temp = `${target}.compressing`;
  const sdr = `${file}.sdr.mov`;
  let input = file;

  try {
    if (item.hdr) {
      /* ffmpeg can only tone-map with filters this build may not have; macOS ships
       * the converter Photos itself uses, which also lands it at 1080p. */
      if (process.platform !== 'darwin') throw new Error(`${file} is HDR, which needs macOS's avconvert to tone-map.`);
      await run('avconvert', ['-s', file, '-p', 'Preset1920x1080', '-o', sdr, '--replace']);
      input = sdr;
    }

    // Fit inside 1920x1080 either way up, never enlarging; even sides for yuv420p.
    const fit = (side, landscape, portrait) => `'min(${side},if(gte(iw,ih),${landscape},${portrait}))'`;
    const scale =
      `scale=w=${fit('iw', VIDEO.long, VIDEO.short)}:h=${fit('ih', VIDEO.short, VIDEO.long)}` +
      ':force_original_aspect_ratio=decrease:force_divisible_by=2';
    await run('ffmpeg', [
      '-v', 'error', '-y', '-i', input,
      '-map', '0:v:0', '-map', '0:a?',
      '-vf', scale,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(VIDEO.crf),
      '-maxrate', VIDEO.maxrate, '-bufsize', VIDEO.bufsize, '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', VIDEO.audio,
      // Index up front, so playback starts before the whole file has arrived.
      '-movflags', '+faststart', '-map_metadata', '-1',
      '-f', 'mp4', temp,
    ], { maxBuffer: 1 << 24 });

    const after = (await stat(temp)).size;
    if (after >= before && problems.every((p) => p.endsWith('Mbps'))) {
      await unlink(temp);
      return null;
    }

    await rename(temp, target);
    if (target !== file) {
      await unlink(file);
      const manifest = path.join(ALBUMS, album, 'manifest.js');
      if (await exists(manifest)) {
        const ref = (f) => `./${path.relative(path.join(ALBUMS, album), f).split(path.sep).join('/')}`;
        await writeFile(manifest, rewrite(await readFile(manifest, 'utf8'), [[ref(file), ref(target)]]));
      }
    }
    return { before, after, target };
  } finally {
    await unlink(temp).catch(() => {});
    await unlink(sdr).catch(() => {});
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

  console.log(`Plate cap is ${cap}px on the long edge (src/lib/media.ts). Anything beyond it is never served.`);
  console.log(`Videos: H.264 mp4, within ${VIDEO.long}x${VIDEO.short}, under ${VIDEO.ceiling / 1e6} Mbps.\n`);

  /* Surveyed up front so the confirmation can state the real damage, and so a
   * dry run and a live run walk exactly the same list. */
  const work = [];
  let skipped = 0;
  for (const album of albums) {
    for (const file of await filesIn(album, RESIZABLE)) {
      const { width, height } = await sharp(file).metadata();
      if (Math.max(width, height) > cap) work.push({ album, file, kind: 'image' });
      else skipped++;
    }
  }

  const clips = (await Promise.all(albums.map((album) => filesIn(album, VIDEOS)))).flat().length;
  const ffmpeg = await run('ffmpeg', ['-version']).then(() => true, () => false);
  if (clips > 0 && !ffmpeg) {
    console.log(`ffmpeg isn't installed, so ${clips} video${clips === 1 ? ' is' : 's are'} skipped. brew install ffmpeg\n`);
  }
  if (ffmpeg) {
    for (const album of albums) {
      for (const file of await filesIn(album, VIDEOS)) {
        const probed = await probe(file);
        const problems = videoProblems(file, probed);
        if (problems.length > 0) work.push({ album, file, kind: 'video', hdr: probed.hdr, problems });
        else skipped++;
      }
    }
  }

  if (work.length === 0) {
    console.log(`Nothing to do — all ${skipped} files are already within the cap.`);
    return;
  }

  let totalBefore = 0;
  for (const { file } of work) totalBefore += (await stat(file)).size;

  console.log(`${work.length} to compress, ${skipped} already within the cap.`);
  if (!dryRun && !assumeYes) await confirm(work.length, totalBefore);

  let before = 0;
  let after = 0;
  let changed = 0;
  let album = null;

  for (const item of work.sort((a, b) => a.album.localeCompare(b.album))) {
    if (item.album !== album) {
      album = item.album;
      console.log(`\n${album}`);
    }
    const name = path.basename(item.file);

    if (item.kind === 'video') {
      if (dryRun) {
        changed++;
        console.log(`  would re-encode ${name}  (${item.problems.join(', ')})  ${bytes((await stat(item.file)).size)} → ?`);
        continue;
      }
      const result = await transcode(item);
      if (!result) continue;
      changed++;
      before += result.before;
      after += result.after;
      const renamed = result.target === item.file ? '' : ` as ${path.basename(result.target)}`;
      console.log(
        `  re-encoded ${name}${renamed}  (${item.problems.join(', ')})  ` +
          `${bytes(result.before)} → ${bytes(result.after)}`,
      );
      continue;
    }

    const result = await shrink(item.file, cap, dryRun);
    if (!result) continue;

    changed++;
    before += result.before;
    after += result.after ?? result.before;
    const size = dryRun
      ? `${bytes(result.before)} → ?`
      : `${bytes(result.before)} → ${bytes(result.after)}`;
    console.log(
      `  ${dryRun ? 'would resize' : 'resized'} ${name}  ` +
        `${result.width}x${result.height} → ${result.target}x${result.scaled}  ${size}`,
    );
  }

  console.log(`\n${dryRun ? 'Would rewrite' : 'Rewrote'} ${changed} file${changed === 1 ? '' : 's'}.`);
  if (!dryRun && changed > 0) {
    console.log(`${bytes(before)} → ${bytes(after)}  (${((1 - after / before) * 100).toFixed(1)}% smaller)`);
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
