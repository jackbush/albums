/*
 * Takes re-exported album sources: newest version wins, older ones go, the suffix
 * comes off, manifests follow, then `compress-media.mjs` runs over what changed.
 *
 * Re-exporting a photograph leaves the folder holding every generation of it:
 *
 *   DSC0001.jpg      the one in the manifest
 *   DSC0001-2.jpg    a re-export
 *   DSC0001-3.jpg    the one you actually want
 *
 * So: keep the highest number, delete the rest, rename it to the bare stem, and the
 * manifest's "./media/DSC0001.jpg" is pointing at the new file without being edited.
 * Where it does need editing — an export that changed extension, say — the manifest
 * is rewritten too.
 *
 * ## What counts as a version
 *
 * `STEM-N` where N is nothing but digits, and only when there is something for it to
 * be a version *of*: a `STEM` file on disk, another `STEM-M` beside it, or a manifest
 * reference to `STEM`. Two reasons for that test rather than stripping every `-N`:
 *
 *   - Album folders are full of hyphens and trailing digits already. A phone export
 *     called `035E766C-…-30186-0000057F18C9BA86.jpg` is one file, not a version of
 *     `035E766C-…-30186`, and nothing in this script may touch it.
 *   - Variants made by hand are lettered, not numbered — `cover/a.jpg` through
 *     `cover/g.jpg` — so they carry no `-N` and never enter a group. Numbered means
 *     re-exported; lettered means someone chose it.
 *
 * Anything with a `-N` that fails the test is reported as skipped rather than guessed
 * at. So is a group whose winner is ambiguous — `DSC0001-3.jpg` and `DSC0001-3.png`
 * are both "version 3", and picking one of them is not this script's call to make.
 *
 * Destructive: it deletes the older generations and then hands the survivors to the
 * compressor, which overwrites them. Both are recoverable from git as long as the
 * files were committed; nothing here goes near a file git hasn't got.
 *
 * Usage:
 *   npm run reexport                     # every album
 *   npm run reexport -- 2026-orchids     # named albums only
 *   npm run reexport -- --dry-run        # report, change nothing
 *   npm run reexport -- --yes            # skip the confirmation
 *   npm run reexport -- --no-compress    # stop after the manifests
 *
 * Album folders only, which is the same ground `npm run compress` covers —
 * `src/albums/home-cover.jpg` and anything else loose in `src/albums/` is left alone.
 */

import { createInterface } from 'node:readline/promises';
import { readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ALBUMS = 'src/albums';

/** What the site can resolve: see the globs in src/lib/media.ts. */
const IMAGES = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);
const VIDEOS = new Set(['.mp4', '.webm', '.mov']);

/** A trailing `-2`, `-3`, `-10`. Greedy on the stem, so it reads the last group. */
const VERSION = /^(.+)-(\d+)$/;

const bytes = (n) => `${(n / 1e6).toFixed(1)} MB`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function isMedia(file) {
  const ext = path.extname(file).toLowerCase();
  return IMAGES.has(ext) || VIDEOS.has(ext);
}

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

/** Every media file under an album, at any depth — media/, b-roll/, cover/ alike. */
async function mediaIn(album) {
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
      else if (isMedia(entry.name)) found.push(full);
    }
  }
  await walk(path.join(ALBUMS, album));
  return found.sort();
}

/**
 * Every `"./…"` path written in a manifest, in source order, with duplicates kept.
 *
 * Read out of the text rather than by importing the module, because manifests carry
 * whole blocks and frames commented out — held in reserve while an album is edited.
 * A path behind a `//` is still a reference: the file it names has to keep existing,
 * and if the name changes, that line has to change with it.
 */
function referencesIn(source) {
  return [...source.matchAll(/(['"])(\.\/[^'"\n]+)\1/g)].map((m) => m[2]);
}

/** Splits a filename the way a group needs it: "DSC0001-3.jpg" → stem, ext, base, n. */
function parse(file) {
  const ext = path.extname(file);
  const stem = path.basename(file, ext);
  const match = VERSION.exec(stem);
  return {
    dir: path.dirname(file),
    ext,
    stem,
    base: match ? match[1] : stem,
    n: match ? Number(match[2]) : null,
  };
}

/**
 * Plans one album: which files go, which one is renamed, which references move.
 *
 * Nothing is touched here. The survey has to be complete before anything is deleted,
 * both so the confirmation can state the real damage and so `--dry-run` and a live
 * run walk exactly the same list.
 */
async function planAlbum(album) {
  const files = await mediaIn(album);
  const dir = path.join(ALBUMS, album);
  const manifest = path.join(dir, 'manifest.js');
  const source = await readFile(manifest, 'utf8').catch(() => null);
  const refs = source === null ? [] : referencesIn(source);

  /* Stems present on disk, per folder, so "is there an original to replace?" is a
   * lookup rather than another walk. Extension isn't part of the key: an export that
   * came back as .jpeg is still a version of the .jpg it replaces. */
  const onDisk = new Map();
  for (const file of files) {
    const { dir: folder, stem } = parse(file);
    if (!onDisk.has(folder)) onDisk.set(folder, new Map());
    const stems = onDisk.get(folder);
    if (!stems.has(stem)) stems.set(stem, []);
    stems.get(stem).push(file);
  }

  /** Stems the manifest names, per folder, including behind a comment. */
  const referenced = new Map();
  for (const ref of refs) {
    const resolved = path.join(dir, ref.replace(/^\.\//, ''));
    const { dir: folder, stem } = parse(resolved);
    if (!referenced.has(folder)) referenced.set(folder, new Set());
    referenced.get(folder).add(stem);
  }

  // Candidate versions, grouped by the stem they'd collapse onto.
  const groups = new Map();
  for (const file of files) {
    const info = parse(file);
    if (info.n === null) continue;
    const key = path.join(info.dir, info.base);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ file, ...info });
  }

  const deletions = [];
  const renames = [];
  const skipped = [];
  const warnings = [];

  for (const [key, versions] of [...groups].sort()) {
    const { dir: folder, base } = versions[0];
    const original = onDisk.get(folder)?.get(base) ?? [];
    const named = referenced.get(folder)?.has(base) ?? false;

    /* A lone `-N` with no original, no sibling and no manifest line behind it is not
     * a version of anything — it's a filename that happens to end in a number. */
    if (original.length === 0 && versions.length === 1 && !named) {
      skipped.push({ file: versions[0].file, why: 'nothing named ' + base + ' to replace' });
      continue;
    }

    const highest = Math.max(...versions.map((v) => v.n));
    const winners = versions.filter((v) => v.n === highest);
    if (winners.length > 1) {
      skipped.push({
        file: `${key}-${highest}.*`,
        why: `version ${highest} exists as ${winners.map((w) => w.ext).join(' and ')} — pick one by hand`,
      });
      continue;
    }

    const [winner] = winners;
    const target = path.join(folder, base + winner.ext);

    /* The numbering is the export order, so that's what decides. But a `-2` written
     * after the `-3` means something happened out of sequence, and silently deleting
     * the newer file on disk is exactly the case worth a line of output. */
    const winnerTime = (await stat(winner.file)).mtimeMs;
    for (const other of versions) {
      if (other === winner) continue;
      if ((await stat(other.file)).mtimeMs > winnerTime) {
        warnings.push(
          `${path.basename(other.file)} is newer on disk than ${path.basename(winner.file)}, ` +
            `but ${highest} is the higher version — taking ${path.basename(winner.file)}.`,
        );
      }
    }

    /* Proved readable before anything is destroyed: a re-export that came out
     * truncated doesn't get to replace the file it was meant to improve. */
    const check = await inspect(winner.file);
    if (check) {
      skipped.push({ file: winner.file, why: check });
      continue;
    }

    for (const version of versions) {
      if (version !== winner) deletions.push(version.file);
    }
    /* The original goes too, whatever it was called: same stem, any extension. A
     * re-export that changed format would otherwise leave both behind, with the
     * manifest pointing at whichever one the glob happened to hand it. */
    for (const file of original) deletions.push(file);

    renames.push({ from: winner.file, to: target });
  }

  return { album, manifest, source, refs, deletions, renames, skipped, warnings };
}

/** Returns a reason the file can't be trusted, or null if it opens cleanly. */
async function inspect(file) {
  const { size } = await stat(file);
  if (size === 0) return 'the file is empty';
  if (VIDEOS.has(path.extname(file).toLowerCase())) return null;
  try {
    const { width, height } = await sharp(file).metadata();
    if (!width || !height) return "couldn't read its dimensions";
  } catch (error) {
    return `sharp couldn't open it — ${error.message.split('\n')[0]}`;
  }
  return null;
}

/**
 * Works out which manifest references stop resolving, and what they should say.
 *
 * Run against the plan rather than the filesystem, so it can be reported before a
 * single file has moved. A reference that was already dead before this run is caught
 * here too — the build throws on one (see `missing` in src/lib/media.ts), so it's
 * worth saying out loud even though this script didn't break it.
 */
function planReferences(plan, existing) {
  const dir = path.dirname(plan.manifest);

  // What each folder will hold afterwards, keyed by stem, so a moved reference can
  // be answered with the file that replaced it.
  const after = new Map();
  const add = (file) => {
    const { dir: folder, stem } = parse(file);
    if (!after.has(folder)) after.set(folder, new Map());
    after.get(folder).set(stem, file);
  };

  const gone = new Set(plan.deletions);
  const renamed = new Set(plan.renames.map((r) => r.from));
  for (const file of existing) {
    if (!gone.has(file) && !renamed.has(file)) add(file);
  }
  for (const { to } of plan.renames) add(to);

  const moves = new Map();
  const dead = [];

  for (const ref of new Set(plan.refs)) {
    const resolved = path.join(dir, ref.replace(/^\.\//, ''));
    if (!isMedia(resolved)) continue; // a manifest only points "./" at media
    const { dir: folder, stem } = parse(resolved);
    const replacement = after.get(folder)?.get(stem);

    if (replacement === resolved) continue;
    if (!replacement) {
      dead.push(ref);
      continue;
    }
    moves.set(ref, `./${path.relative(dir, replacement)}`);
  }

  return { moves, dead };
}

/**
 * Rewrites the references in a manifest's text.
 *
 * Substitution on the source, for the same reason the references were read out of it:
 * a commented-out frame has to be repointed as well, and re-serialising a parsed
 * manifest would drop every comment in the file. Only the quoted path is replaced, so
 * a caption that happens to mention a filename is left alone.
 */
function rewrite(source, moves) {
  let text = source;
  for (const [from, to] of moves) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`(['"])${escaped}\\1`, 'g'), `$1${to}$1`);
  }
  return text;
}

async function confirm(question) {
  if (!process.stdin.isTTY) {
    console.error('\nRefusing to delete without confirmation. Re-run with --yes (or --dry-run).');
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\n${question} [y/N] `);
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log('Nothing changed.');
    process.exit(0);
  }
}

/** Hands the touched albums to the compressor, with its confirmation already given. */
function compress(albums, dryRun) {
  const args = ['scripts/compress-media.mjs', ...albums, dryRun ? '--dry-run' : '--yes'];
  console.log(`\n--- npm run compress -- ${args.slice(1).join(' ')}\n`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`compress-media.mjs exited ${code}`)),
    );
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const assumeYes = args.includes('--yes');
  const noCompress = args.includes('--no-compress');
  const named = args.filter((a) => !a.startsWith('--'));

  const albums = await albumsToScan(named);

  const plans = [];
  for (const album of albums) {
    const plan = await planAlbum(album);
    plan.references = planReferences(plan, await mediaIn(album));
    plans.push(plan);
  }

  const touched = plans.filter((p) => p.deletions.length > 0 || p.renames.length > 0);
  const edits = plans.filter((p) => p.references.moves.size > 0);
  const dead = plans.filter((p) => p.references.dead.length > 0);
  const skipped = plans.filter((p) => p.skipped.length > 0);

  /* Reported even on a clean run: a `-N` left on disk is either a version this script
   * declined to touch or a filename that just ends in a number, and which one it is
   * matters enough to say. */
  for (const plan of skipped) {
    console.log(`${plan.album}  — left alone`);
    for (const { file, why } of plan.skipped) {
      console.log(`  ${path.basename(file)}  (${why})`);
    }
    console.log();
  }

  if (touched.length === 0 && edits.length === 0) {
    console.log('No re-exports found — every stem on disk is already the only version of itself.');
    reportDead(dead);
    return dead.length > 0 ? process.exit(1) : undefined;
  }

  let freed = 0;
  for (const plan of touched) {
    console.log(plan.album);
    for (const warning of plan.warnings) console.log(`  ! ${warning}`);
    for (const { from, to } of plan.renames) {
      const versions = plan.deletions.filter((f) => parse(f).base === parse(to).stem);
      for (const file of versions) freed += (await stat(file)).size;
      /* A group can have nothing to replace — a `-2` whose original was deleted by
       * hand, kept because the manifest still names the bare stem. */
      const replacing = versions.length
        ? `replacing ${versions.map((f) => path.basename(f)).join(', ')}`
        : 'no older version on disk';
      console.log(`  ${path.basename(from)} → ${path.basename(to)}  (${replacing})`);
    }
    console.log();
  }

  for (const plan of edits) {
    console.log(`${plan.manifest}`);
    for (const [from, to] of plan.references.moves) console.log(`  ${from} → ${to}`);
    console.log();
  }

  const taken = touched.reduce((n, p) => n + p.renames.length, 0);
  const removed = touched.reduce((n, p) => n + p.deletions.length, 0);
  const repointed = edits.reduce((n, p) => n + p.references.moves.size, 0);
  const clauses = [`${plural(removed, 'older version')} deleted (${bytes(freed)})`];
  if (repointed > 0) clauses.push(`${plural(repointed, 'manifest reference')} repointed`);
  console.log(
    `${dryRun ? 'Would take' : 'Taking'} ${plural(taken, 're-export')}: ${clauses.join(', ')}.`,
  );

  if (!dryRun && !assumeYes) {
    await confirm(
      noCompress ? 'Go ahead?' : 'Go ahead, then run the compressor over these albums?',
    );
  }

  if (!dryRun) {
    for (const plan of touched) {
      for (const file of plan.deletions) await unlink(file);
      /* Deletions first, so a rename onto the original's name has somewhere to land —
       * and if the run dies between the two, what's left is the file the manifest
       * already points at being missing, which the next run resolves. */
      for (const { from, to } of plan.renames) await rename(from, to);
    }
    for (const plan of edits) {
      await writeFile(plan.manifest, rewrite(plan.source, plan.references.moves));
    }
    console.log('\nDone.');
  }

  reportDead(dead);

  if (!noCompress && touched.length > 0) {
    await compress(
      touched.map((p) => p.album),
      dryRun,
    );
  }

  if (dead.length > 0) process.exit(1);
}

/**
 * References with nothing to point at, listed but never guessed at.
 *
 * A stem this script has never seen is a file that was deleted or renamed by hand,
 * and the right new name is a judgement — which photograph was meant — not something
 * to infer from a filename.
 */
function reportDead(plans) {
  if (plans.length === 0) return;
  console.log('\nReferences with no file behind them, which will fail the build:');
  for (const plan of plans) {
    console.log(`  ${plan.manifest}`);
    for (const ref of plan.references.dead) console.log(`    ${ref}`);
  }
  console.log('\nNo version of these on disk to point at — fix them by hand.');
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exit(1);
});
