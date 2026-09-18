---
name: new-album
description: Write manifest.js for an album folder in src/albums/ that has media but no manifest yet. Use when asked to "make a manifest", "add an album", or when a folder under src/albums/ contains media/ and nothing else.
---

# Writing an album manifest

One album = one folder `src/albums/<year>-<slug>/` containing `media/` and `manifest.js`.
The media folder is already curated: **every file in it goes in the manifest, none are dropped.**

**The manifest you write is a scaffold, not a finished album.** Jack writes the prose
afterwards. Generated prose is harder to edit than a blank line, so the rule throughout is:
fill in everything mechanical and factual, leave every line of voice empty. Where this
document says to leave a field empty, leave it empty — do not improve on it.

## Procedure

### 1. Read the capture times

```bash
exiftool -q -p '$FileName  $DateTimeOriginal' -d '%a %d %b %Y  %H:%M' \
  -fileOrder DateTimeOriginal src/albums/<album>/media
```

This is the spine of the whole manifest: manifest order, the day boundaries, and the
`date` field all come out of it. `-fileOrder DateTimeOriginal` puts the list in capture
order, which is the order the album reads in.

Files with no `DateTimeOriginal` (a second camera, a scan) print an empty date and sort to
one end. Place those by content, next to the day they visually belong to.

`sips -g creation` is the *file* date, not the capture date — don't use it.

### 2. Look at every photo — cheaply

Do **not** Read the originals; they are 3–10 MB each. Downscale to previews first:

```bash
ALBUM=src/albums/<album>
OUT="$SCRATCHPAD/prev"   # the session scratchpad dir from the system prompt
mkdir -p "$OUT"
for f in "$ALBUM"/media/*.jpg; do sips -Z 512 "$f" --out "$OUT/$(basename "$f")" >/dev/null 2>&1; done
```

(`sips` is macOS built-in. There is no ImageMagick or PIL on this machine.)

Then Read the previews **~12 per message, in parallel** in capture order. At 512px each costs
~250 tokens, so a 63-photo album is ~15k tokens total. Reading originals would be 10× that.

### 3. Write the manifest

Copy the shape from `src/albums/2011-tibet/manifest.js`. Schema is `src/lib/schema.ts` —
the JSDoc type line at the top is what gives editor autocomplete, keep it:

```js
/** @type {import('../../lib/schema').AlbumManifest} */
export default {
  title: 'India 2015',        // placeholder, from the folder name
  description: 'placeholder',
  date: 'November 2015',
  cover: './media/jb20151109jaipur1.jpg',   // the first photo in items
  items: [ /* ... */ ],
};
```

#### The header fields

| Field | What to write |
| --- | --- |
| `title` | A placeholder built from the folder name: `2015-india` → `'India 2015'`. Title-case the slug, move the year to the end. Don't invent a better one. |
| `description` | The literal string `'placeholder'`. Nothing else. |
| `date` | From the capture times. One month: `'November 2015'`. Spanning two months: take a punt on the season — `'Autumn 2015'`. Spanning years: `'2015-2016'`. |
| `cover` | The `src` of the **first photo in `items`**. Don't pick a favourite. |

#### Day separators

Group the photos by capture day. Before each day's photos — including the first — put a
`quote` block holding that day's date:

```js
{ type: 'quote', text: 'Sat 14 Nov 2015' }
```

Exactly that format: `%a %d %b %Y`, which is what the exiftool command above already prints.
No attribution. A day with no photos gets no block.

#### One photo per block

Photographs live in `photos` blocks, which hold one to six frames. **Default to one frame per
block** — a block of one fills the column, which is the ordinary way a photo appears:

```js
{
  type: 'photos',
  images: [
    {
      src: './media/jb20151114jaisalmer3.jpg',
      alt: 'Camels resting in the shade of a thorn tree, saddles stacked beside them',
    },
  ],
  caption: false,
}
```

Put several frames in one block only when they are **clearly one series** — shot within about
five minutes of each other, on the same subject, of a piece. Capture times tell you this;
don't group on vibe. When in doubt, separate blocks.

```js
{
  type: 'photos',
  images: [
    { src: './media/a.jpg', alt: '...' },
    { src: './media/b.jpg', alt: '...' },
  ],
  caption: false,
}
```

Rows follow the count: 2 → 2, 3 → 3, 4 → 2+2, 5 → 3+2, 6 → 2+2+2. Frames keep capture order.
Optional `hero: true` gives the first frame a full-width row of its own and re-rows the rest:
3 → 1+2, 4 → 1+3, 5 → 1+2+2, 6 → 1+3+2. Field notes in `README.md` under "Block types".

#### Alt text — fill in every one

`alt` is **screen readers and the full-screen viewer only**. It is never printed on the page,
so it can't sound like generated caption prose and it costs Jack no editing. Write one for
every frame, in every `photos` block, however many frames it holds.

- One clause, present tense. No "photo of", no "image showing".
- Describe what is actually visible — composition, light, colour, what someone is doing.
- **Name the subject specifically when you recognise it**: `"St Paul's Cathedral, London"`,
  `"The Charminar at dusk, Hyderabad"`, not `"a large domed building"`. Recognition is the
  point; hedge only when you genuinely aren't sure.
- Lead with `Black and white:` when the frame is monochrome.

#### Captions — leave every one `false`

Every `photos` block gets `caption: false`. The schema accepts `false` as "not
written yet": it renders as no caption, and the key sits there ready to be filled in.

**Never write caption text.** Not a draft, not a placeholder phrase, not a "feel free to
change this". A `false` is faster to replace than a sentence is to delete.

#### No `text` blocks

Don't add narrative prose blocks. If the album wants them, Jack adds them.

#### Place names

Filenames are the photographer's own labels and are sometimes wrong for the frame (a `kopan`
file may plainly be somewhere else). Trust the photo over the filename: describe what you see,
and name what you actually recognise.

### 4. Register it on the home page — commented out

Add the folder name to `posts` in `src/albums/index.js` in newest-first position, but leave
the line **commented out**:

```js
  posts: [
    // '2015-india',
    '2013-iceland',
```

The page still builds at its own URL, so it can be previewed; it just isn't linked from the
index yet. Jack uncomments the line when the album is finished.

### 5. Verify

```bash
npx astro check
```

Expect `0 errors`. This is the check to run — **don't** run `npm run build`, which takes
around seven minutes because it regenerates every responsive variant.

`astro check` only reads `.astro` and `.ts`, so it won't catch a typo in a `src` path — the
manifests are `.js`. Re-read your paths against the `exiftool` listing instead; that, plus
the editor squiggles from the JSDoc type line, is the coverage you get.

## Hand it back

Report what you did in a couple of lines: photo count, day count, how many groups you made and
why, and any file you couldn't date or place. Then stop — the captions are Jack's half.
