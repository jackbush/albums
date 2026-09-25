/*
 * Puts album manifests into house order: one property per line, and `photos` blocks
 * keyed in a fixed sequence — type, hero, closer, caption, images.
 *
 * The images array is long and the flags above it are what get edited, so they sit
 * together at the top of the block where they can be read at a glance rather than
 * hunted for either side of forty lines of paths.
 *
 * This is a text transform, deliberately. Manifests carry comments, and whole blocks
 * and frames held in reserve behind `//` — parsing and re-serialising would drop
 * every one of them silently. So the file is walked line by line and only the lines
 * that need to move are moved; comments ride along with the property beneath them.
 *
 * Idempotent: a second run reports everything unchanged.
 *
 * Usage:
 *   npm run format                                  # every album
 *   npm run format -- src/albums/2019-purbeck       # named albums or files
 *   npm run format -- --check                       # exit 1 if anything would move
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ALBUMS = 'src/albums';

/** House order for a `photos` block. Anything unrecognised is kept, ahead of `images`. */
const ORDER = ['type', 'hero', 'closer', 'caption', 'images'];

/**
 * Splits an object's inner text into top-level `key: value` pairs.
 *
 * Not a comma split: a caption or alt can hold commas of its own, and an inline
 * `images: [{ … }]` holds both commas and brackets, so quotes and nesting are
 * tracked rather than assumed away.
 */
function splitProps(inner) {
  const parts = [];
  let buf = '';
  let depth = 0;
  let quote = null;

  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      buf += c;
      if (c === '\\') buf += inner[++i];
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
      buf += c;
    } else if ('[{('.includes(c)) {
      depth++;
      buf += c;
    } else if (']})'.includes(c)) {
      depth--;
      buf += c;
    } else if (c === ',' && depth === 0) {
      parts.push(buf.trim());
      buf = '';
    } else {
      buf += c;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.filter(Boolean);
}

/** `{ a: 1, b: 2 },` on one line becomes one property per line. */
function expandInline(line) {
  const m = line.match(/^(\s*)\{(.+)\},?\s*$/);
  if (!m) return [line];

  const [, indent, inner] = m;
  const props = splitProps(inner);
  if (props.length < 2) return [line];

  return [`${indent}{`, ...props.map((p) => `${indent}  ${p},`), `${indent}},`];
}

/**
 * Groups an object body into one chunk per property, each carrying whatever
 * follows it — a nested array, or the comment lines written above it.
 */
function chunkProps(body, indent) {
  const pat = new RegExp(`^${' '.repeat(indent)}(\\w+)\\s*:`);
  const chunks = [];
  let pending = [];
  let current = null;

  for (const line of body) {
    const m = line.match(pat);
    if (m) {
      if (current) chunks.push(current);
      current = { key: m[1], lines: [...pending, line] };
      pending = [];
    } else if (current) {
      current.lines.push(line);
    } else {
      pending.push(line);
    }
  }
  if (current) chunks.push(current);
  return { chunks, trailing: pending };
}

function reorder(chunks) {
  const known = new Map(chunks.filter((c) => ORDER.includes(c.key)).map((c) => [c.key, c]));
  const unknown = chunks.filter((c) => !ORDER.includes(c.key));
  const before = ORDER.filter((k) => k !== 'images' && known.has(k)).map((k) => known.get(k));
  const images = known.get('images');
  return [...before, ...unknown, ...(images ? [images] : [])];
}

function format(source) {
  // Pass one: any object written inline gets a line per property.
  const expanded = [];
  for (const line of source.split('\n')) {
    if (/^\s*\{.*\},?\s*$/.test(line) && (line.match(/:/g) ?? []).length >= 2) {
      expanded.push(...expandInline(line));
    } else {
      expanded.push(line);
    }
  }

  // Pass two: reorder the keys of live `photos` blocks. Items sit at indent 4;
  // a commented-out block never matches, so it is left exactly as written.
  const out = [];
  for (let i = 0; i < expanded.length; ) {
    if (expanded[i] !== '    {') {
      out.push(expanded[i++]);
      continue;
    }

    let j = i + 1;
    while (j < expanded.length && expanded[j] !== '    },' && expanded[j] !== '    }') j++;

    let body = expanded.slice(i + 1, j);
    if (body.some((l) => /^ {6}type:\s*"photos"/.test(l))) {
      const { chunks, trailing } = chunkProps(body, 6);
      body = [...reorder(chunks).flatMap((c) => c.lines), ...trailing];
    }

    out.push(expanded[i], ...body, expanded[j] ?? '    },');
    i = j + 1;
  }

  return out.join('\n');
}

async function manifests(targets) {
  if (targets.length === 0) {
    const dirs = (await readdir(ALBUMS, { withFileTypes: true })).filter((e) => e.isDirectory());
    return dirs.map((d) => path.join(ALBUMS, d.name, 'manifest.js')).sort();
  }
  return Promise.all(
    targets.map(async (t) => {
      const s = await stat(t).catch(() => null);
      if (s?.isDirectory()) return path.join(t, 'manifest.js');
      return t.endsWith('.js') ? t : path.join(ALBUMS, t, 'manifest.js');
    }),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const files = await manifests(args.filter((a) => !a.startsWith('--')));

  let moved = 0;
  for (const file of files) {
    const source = await readFile(file, 'utf8').catch(() => null);
    if (source === null) continue;

    const result = format(source);
    if (result === source) continue;

    moved++;
    if (check) console.log(`would reformat  ${file}`);
    else {
      await writeFile(file, result);
      console.log(`reformatted     ${file}`);
    }
  }

  if (moved === 0) console.log(`All ${files.length} manifests already in house order.`);
  if (check && moved > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
