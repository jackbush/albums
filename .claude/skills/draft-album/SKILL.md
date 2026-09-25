---
name: draft-album
description: Draft manifest.js for an album folder in src/albums/ that has media but no manifest yet. Use when asked to "draft an album", "make a manifest", "add an album", or when a folder under src/albums/ contains media/ and nothing else. The draft is finished by `publish-album`.
---

# Drafting an album manifest

One album = one folder `src/albums/<year>-<slug>/` containing `media/` and `manifest.js`.
The media folder is already curated: **every file in it goes in the manifest, none are dropped.**

**The manifest you write is a scaffold, not a finished album.** Generated prose is harder to edit 
than a blank line: fill in everything mechanical and factual, leave every line of voice empty. Where 
this document says to leave a field empty, leave it empty — do not improve on it.

A draft becomes an album when `publish-album` runs over it. That skill checks the writing and
puts it on the home page; this one gets the blocks and the facts right.

**Everything you write is UK English** — `colour`, `terraced`, `harbour`, `-ise` endings
(`recognise`, not `recognize`). That covers `alt` text, and the `title` and `text` of a
subheading. `publish-album` checks it again, but it shouldn't have anything to find.

## Procedure

### 1. Read the capture times

```bash
exiftool -q -p '$FileName  $DateTimeOriginal' -d '%a %d %b %Y  %H:%M' \
  -fileOrder DateTimeOriginal src/albums/<album>/media
```

This is the spine of the whole manifest: manifest order, the day boundaries and the
`year` field all come out of it. `-fileOrder DateTimeOriginal` puts the list in capture
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
the JSDoc type line at the top is what gives editor autocomplete, keep it.

**Strings are double-quoted.** Every manifest in the repo is written that way, and the audit in
`publish-album` flags any that aren't. A string holding a double quote of its own is the one
exception — single-quote that one rather than escaping it.

**One property per line, always** — never an inline object, however short. A subheading fits on
one line and still gets four; so does an `images` entry. These files are edited by hand far more
than they are read, and a property alone on its line is one a person can change, comment out or
move without picking a line apart first.

**A `photos` block keys in this order:** `type`, `hero`, `closer`, `caption`, `images`. The
images array is long and the flags above it are what get edited, so they belong together at the
top where they can be read at a glance rather than hunted for either side of forty lines of
paths. Other block types keep the order their fields are documented in.

`npm run format` puts a manifest into both of these, and `publish-album` runs it. Write them
right the first time anyway — the formatter is a safety net, not the plan.

```js
/** @type {import('../../lib/schema').AlbumManifest} */
export default {
  title: "India 2015",        // placeholder, from the folder name
  location: "India",          // placeholder, from the folder name
  year: "2015",               // from the capture times
  cover: "./media/jb20151109jaipur1.jpg",   // the first photo in items
  items: [ /* ... */ ],
};
```

#### The header fields

| Field | What to write |
| --- | --- |
| `title` | A placeholder built from the folder name: `2015-india` → `"India 2015"`. Title-case the slug, move the year to the end. Don't invent a better one. |
| `location` | A placeholder from the folder name: `2015-india` → `"India"`. Drop the year, title-case the rest. Don't reach for a region you can't see in the frames. |
| `year` | From the capture times. One year: `"2015"`. Spanning two: `"2015-16"`. |
| `cover` | The `src` of the **first photo in `items`**. Don't pick a favourite. |

#### Standalone albums

If the album was asked for as **standalone** — an unlisted album, a walkthrough, a page shared
by link alone — add `standalone: true` under `cover`:

```js
  cover: "./media/jb20151109jaipur1.jpg",
  standalone: true,
```

It drops the back-link bars at the top and bottom of the page. Only set it when asked; an
ordinary album leaves the key out. A standalone album also **skips step 5 entirely** — it does
not go into `src/albums/index.js`, not even as a commented-out line.

#### Day separators

Group the photos by capture day. Before each day's photos — including the first — put a
`subheading` block holding that day's date. Leave its optional `text` off; that line is the
user's to write:

```js
{
  type: "subheading",
  title: "Sat 14 Nov 2015",
}
```

Exactly that format: `%a %d %b %Y`, which is what the exiftool command above already prints.
No attribution. A day with no photos gets no block.

#### One photo per block

Photographs live in `photos` blocks, which hold one to six frames. **Default to one frame per
block** — a block of one fills the column, which is the ordinary way a photo appears:

```js
{
  type: "photos",
  caption: false,
  images: [
    {
      src: "./media/jb20151114jaisalmer3.jpg",
      alt: "Camels resting in the shade of a thorn tree, saddles stacked beside them",
    },
  ],
}
```

Put several frames in one block only when they are **clearly one series** — shot within about
five minutes of each other, on the same subject, of a piece. Capture times tell you this;
don't group on vibe. When in doubt, separate blocks.

**Flora and fungi close-ups break capture order.** Collect each day's — flowers, mushrooms,
lichen, moss, leaves — into one block, placed after that day's last photo block and before the
next day's `subheading`. More than six in a day takes two adjacent blocks.

```js
{
  type: "photos",
  caption: false,
  images: [
    {
      src: "./media/a.jpg",
      alt: "...",
    },
    {
      src: "./media/b.jpg",
      alt: "...",
    },
  ],
}
```

Rows follow the count: 2 → 2, 3 → 3, 4 → 2+2, 5 → 3+2, 6 → 2+2+2. Frames keep capture order.
Optional `hero: true` gives the first frame a full-width row of its own and re-rows the rest:
3 → 1+2, 4 → 1+3, 5 → 1+2+2, 6 → 1+3+2. Optional `closer: true` does the same at the other
end, the last frame taking the row: 3 → 2+1, 4 → 3+1, 5 → 2+2+1, 6 → 3+2+1. Both together
bracket the block: 2 → 1+1, 4 → 1+2+1, 6 → 1+2+2+1.

Two shapes fall out of the frames themselves rather than the count, so they aren't yours to
choose — but they are worth knowing when you group. A `hero` block of four or more (three,
without a `closer`) whose **first frame is upright** builds a rectangle instead: the hero down
the left, two frames stacked on the right, the rest in ordinary rows underneath. And any
**upright frame left alone on its row** sits at two thirds of the column rather than filling
it — a block of one, an upright `closer`, an upright `hero` where the rectangle doesn't apply.
Field notes in `README.md` under "Block types".

#### Orientation

Read the shapes before grouping. The pixels are already rotated, so width against height is
the answer:

```bash
exiftool -q -p '$FileName $ImageWidth $ImageHeight' src/albums/<album>/media \
  | awk '{ print $1, ($2 > $3 ? "landscape" : "portrait") }'
```

- A row of three goes symmetrical: landscape-portrait-landscape, or portrait-landscape-portrait.
  Reorder within the block — inside a block, orientation beats capture order.
- Two portraits and one landscape: `hero: true`, landscape first.

#### Alt text — fill in every one

`alt` is **screen readers only**. It is never printed on the page,
so it can't sound like generated caption prose and it costs no editing. Write one for
every frame, in every `photos` block, however many frames it holds.

- One clause, present tense. No "photo of", no "image showing".
- Describe what is actually visible — composition, light, colour, what someone is doing.
- **Name the subject specifically when you recognise it**: `"St Paul's Cathedral, London"`,
  `"The Charminar at dusk, Hyderabad"`, not `"a large domed building"`. Recognition is the
  point; hedge only when you genuinely aren't sure.

#### Captions — leave every one `false`

Every `photos` block gets `caption: false`. The schema accepts `false` as "not
written yet": it renders as no caption, and the key sits there ready to be filled in.

**Never write caption text.** Not a draft, not a placeholder phrase, not a "feel free to
change this". A `false` is faster to replace than a sentence is to delete.

#### A `b-roll/` folder means a b-roll block

If the album folder holds a **`b-roll/`** subfolder alongside `media/`, those frames don't go
into `photos` blocks at all. They belong in one `broll` block, placed at the end of the
section they come from — the end of the album, if there's only one pile of them.

The rules are the schema's: **a multiple of six frames** (three across on a wide screen, two
on a phone), every frame cropped to the aspect ratio of the first, `alt` on each, one shared
`caption` left `false`. Nothing else in the block to decide — no row shapes, no `hero`. Frames
go in capture order.

Read them the same cheap way as the rest (step 2) and write a real `alt` for each: they open
full screen like any other plate. **Check the shapes before you write the block** — the grid
crops everything to the first frame's ratio, so a portrait among landscapes loses its top and
bottom. If the folder holds a mix, say so rather than quietly cropping.

The `b-roll/` frames and the `media/` ones can share filenames. Keep the folder in the path:
`./b-roll/DSC_0006.jpg` and `./media/DSC_0006.jpg` are two different photographs.

#### Flora blocks — hand the captions to `flora-id`

Flora blocks get `caption: false` like everything else. The `flora-id` skill writes them: it
reads the originals, identifies each frame, and fills in the caption. Invoke it after step 4,
when the blocks are final.

#### Quote blocks — hand them to `quote-find`

Don't write quote blocks yourself, and never invent a quotation to fill a gap. The
`quote-find` skill does this: it reads the `alt` text and flora captions for subjects, searches
out real quotations about them, and proposes a numbered list for the user to approve. Invoke it
after step 4, alongside `flora-id`, when the blocks are final.

#### Place names

Filenames are the photographer's own labels and are sometimes wrong for the frame (a `kopan`
file may plainly be somewhere else). Trust the photo over the filename: describe what you see,
and name what you actually recognise.

### 4. Second pass: the loose uprights

"Upright" is the shape of the frame — taller than it is wide, what the orientation command in
step 3 prints as `portrait`. It says nothing about the subject: most upright frames here are
landscapes in the ordinary sense of the word.

Two upright frames side by side fill a row; one alone doesn't. With the manifest otherwise
finished, go day by day and pair each upright frame still sitting on its own with the nearest
loose upright **from the same day**, placing the pair where the earlier of the two was. Skip
frames already in a burst or flora group. An odd one out stays a block of one — never pair
across days.

Then invoke `flora-id` for the flora captions, and `quote-find` for quote blocks.

### 5. Register it on the home page — commented out

**Skip this step for a standalone album.** It stays out of `src/albums/index.js` altogether.

Add the folder name to `posts` in `src/albums/index.js` in newest-first position, but leave
the line **commented out**:

```js
  posts: [
    // '2015-india',
    '2013-iceland',
```

The page still builds at its own URL, so it can be previewed; it just isn't linked from the
index yet. `publish-album` uncomments the line when the album is ready.

### 6. Verify

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
why, and any file you couldn't date or place. Then stop — the captions and the home page are
`flora-id`, `quote-find` and `publish-album`'s work, not this skill's.

The album is a draft until `publish-album` runs over it.
