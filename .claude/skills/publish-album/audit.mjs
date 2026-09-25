import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';

const slug = process.argv[2];
const { default: m } = await import(
  pathToFileURL(resolve(`src/albums/${slug}/manifest.js`)).href
);

// A block of one frame is the album's baseline rhythm, not a repeat, so it has no shape to
// match on — and neither `hero` nor `closer` changes a single frame, so it stays shapeless
// whatever they're set to. Anything with more frames does, and the flags are part of the
// shape there: four frames and four with a closer lay out differently, so they aren't a
// repeat of each other.
const shape = (it) => {
  if (it.type !== 'photos') return null;
  if (it.images.length === 1) return null;
  const flags = [it.hero && 'hero', it.closer && 'closer'].filter(Boolean);
  return `${it.images.length} images${flags.length ? ` + ${flags.join(' + ')}` : ''}`;
};

// Which subheading each block sits under, and the runs of photo blocks between breaks.
let section = '(before the first subheading)';
let run = [];
const runs = [];
const flush = () => { if (run.length) runs.push({ section, blocks: [...run] }); run = []; };

m.items.forEach((it, i) => {
  if (it.type === 'photos') { run.push(i + 1); return; }
  flush();
  if (it.type === 'subheading') section = it.title;
});
flush();

console.log('— Photo runs longer than 12 —');
const long = runs.filter((r) => r.blocks.length > 12);
console.log(long.length
  ? long.map((r) => `  ${r.blocks.length} in a row, blocks ${r.blocks[0]}–${r.blocks.at(-1)}, under "${r.section}"`).join('\n')
  : '  none');

console.log('\n— Repeated photo-block shapes —');
const repeats = [];
for (let i = 0; i < m.items.length; ) {
  const s = shape(m.items[i]);
  if (!s) { i++; continue; }
  let j = i;
  while (j + 1 < m.items.length && shape(m.items[j + 1]) === s) j++;
  if (j > i) repeats.push(`  blocks ${i + 1}–${j + 1}: ${j - i + 1} in a row, each ${s}`);
  i = j + 1;
}
console.log(repeats.length ? repeats.join('\n') : '  none');

// A flora caption numbers its frames, and the form is fixed — see the flora-id skill.
// Only the mechanical half is checkable: the marker and the full stops. Sentence case and
// genus capitals need eyes, because `Cladonia` and `Trumpet` look identical to a regex.
const looksFlora = (v) => /(^|\s)(\(\d+\)\s|\d+:\s)/.test(v);

const floraNotes = (v) => {
  const notes = [];
  if (/\(\d+\)/.test(v)) notes.push('frame markers should be "1:", not "(1)"');
  if (/\.\d+:/.test(v)) notes.push('needs a space between entries');
  for (const [, n, body] of v.matchAll(/(\d+):\s*([\s\S]*?)(?=\s\d+:\s|$)/g)) {
    if (!body.trim().endsWith('.')) notes.push(`entry ${n} doesn't end in a full stop`);
  }
  return notes;
};

console.log('\n— Captions and quote attributions —');
const flags = [];
m.items.forEach((it, i) => {
  // Captions are sentences and close like one. An attribution is a name and a title,
  // not a sentence, so it only has to start with a capital.
  const check = (field, v, needsStop) => {
    const notes = [];
    if (needsStop && !/[.!?…]$/.test(v)) notes.push('no closing punctuation');
    if (v[0] !== v[0].toUpperCase()) notes.push('lower-case first letter');
    if (field === 'caption' && looksFlora(v)) notes.push(...floraNotes(v));
    if (notes.length) flags.push(`  [${i + 1}] ${field}: ${notes.join(', ')} — ${JSON.stringify(v)}`);
  };
  if (['photos', 'broll', 'video'].includes(it.type) && typeof it.caption === 'string') check('caption', it.caption, true);
  if (it.type === 'quote' && it.attribution) check('attribution', it.attribution, false);
});
console.log(flags.length ? flags.join('\n') : '  none');

// Every media path the manifest points at — frames, video sources, video posters, and
// the cover, which is easy to forget because no block holds it. Paths keep the folder
// they name: `media/` and `b-roll/` can hold the same filename, and in Indonesia they do.
const referenced = new Set();
const ref = (p) => p && referenced.add(p.replace(/^\.\//, ''));
ref(m.cover);
for (const it of m.items) {
  if (it.type === 'photos' || it.type === 'broll') it.images.forEach((g) => ref(g.src));
  if (it.type === 'video') { ref(it.src); ref(it.poster); }
}

console.log('\n— Media on disk with nothing pointing at it —');
const onDisk = [];
for (const folder of ['media', 'b-roll']) {
  try {
    onDisk.push(...readdirSync(join('src/albums', slug, folder)).map((f) => `${folder}/${f}`));
  } catch {
    // b-roll is optional; a missing media/ is worth saying.
    if (folder === 'media') console.log('  (no media/ folder)');
  }
}
// A file can also be named in the manifest source without being live — a block commented
// out, a frame toggled off. Those are held on purpose, so they are not orphans. The imported
// module can't see them, so read the source text as well.
const source = readFileSync(join('src/albums', slug, 'manifest.js'), 'utf8');
const mentioned = (f) => source.includes(f);

const unused = onDisk.filter((f) => !f.split('/')[1].startsWith('.') && !referenced.has(f));
const commented = unused.filter(mentioned);
const orphans = unused.filter((f) => !mentioned(f));

console.log(orphans.length
  ? orphans.map((f) => `  ${f}`).join('\n') +
    `\n  ${orphans.length} of ${onDisk.length} files. NOT deleted — see the skill.`
  : '  none');

// Manifests are written with double-quoted strings. A literal that holds a double quote of
// its own is allowed to stay single-quoted — that costs no escapes.
const ts = (await import('typescript')).default;
const sf = ts.createSourceFile('m.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const singles = [];
const walkQuotes = (n) => {
  if (ts.isStringLiteral(n)) {
    const raw = source.slice(n.getStart(sf), n.getEnd());
    if (raw[0] === "'" && !raw.includes('"')) {
      singles.push(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1);
    }
  }
  n.forEachChild(walkQuotes);
};
walkQuotes(sf);

console.log('\n— Single-quoted strings (manifests use double quotes) —');
console.log(singles.length
  ? `  ${singles.length} on lines ${singles.join(', ')}`
  : '  none');

if (commented.length) {
  console.log('\n— Named in the manifest but switched off (KEEP — not orphans) —');
  console.log(commented.map((f) => `  ${f}`).join('\n'));
}
