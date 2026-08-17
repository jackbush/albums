---
name: new-album
description: Write manifest.js for an album folder in src/albums/ that has media but no manifest yet. Use when asked to "make a manifest", "add an album", or when a folder under src/albums/ contains media/ and nothing else.
---

# Writing an album manifest

One album = one folder `src/albums/<year>-<slug>/` containing `media/` and `manifest.js`.
The media folder is already curated: **every file in it goes in the manifest, none are dropped.**

## Procedure

### 1. List the media in natural sort order

```bash
ls src/albums/<album>/media | sort -V
```

`sort -V` matters — plain `ls` puts `foo20` before `foo7`. Manifest order = this order.
Filenames are `jb<YYYYMMDD><place><n>.jpg`, so natural order is chronological, which is the order the album should read in.

Odd names (`_1270691.jpg`, from a second camera) carry no usable EXIF date. Place them by
content next to the day they visually belong to.

### 2. Look at every photo — cheaply

Do **not** Read the originals; they are 3–10 MB each. Downscale to previews first:

```bash
ALBUM=src/albums/<album>
OUT="$SCRATCHPAD/prev"   # the session scratchpad dir from the system prompt
mkdir -p "$OUT"
for f in "$ALBUM"/media/*.jpg; do sips -Z 512 "$f" --out "$OUT/$(basename "$f")" >/dev/null 2>&1; done
```

(`sips` is macOS built-in. There is no ImageMagick or PIL on this machine.)

Then Read the previews **~12 per message, in parallel** in filename order. At 512px each costs
~250 tokens, so a 63-photo album is ~15k tokens total. Reading originals would be 10× that.

### 3. Write the manifest

Copy the shape from `src/albums/2011-tibet/manifest.js`. Schema is `src/lib/schema.ts` —
the JSDoc type line at the top is what gives editor autocomplete, keep it:

```js
/** @type {import('../../lib/schema').AlbumManifest} */
export default {
  title: '...',
  description: '...',
  date: 'November 2011',            // free-form display string, never parsed
  cover: './media/<one of the items>.jpg',
  items: [ /* ... */ ],
};
```

Item types: `image` (`src`, `alt`), `video`, `quote`, `text`. Optional `theme` block per album.

**Voice** — match the existing manifests, they set the house style:

- `title`: place-shaped and plain, not a slogan. "Lhasa and the Valley".
- `description`: one sentence, concrete, slightly dry. Names the season and the feel of the light.
- `alt`: one clause, present tense, no "photo of" / "image showing". Describe what is
  actually visible — composition, light, colour, what someone is doing. Lead with "Black and
  white:" when the frame is monochrome. These are the album's texture, not just a11y filler,
  so they earn real detail.
- `text` blocks: 2–4 of them across the album, at the seams where the trip moves somewhere new.
  A sentence or two, first person implied, no exclamation. They carry the narrative the alt
  text can't.

**Place names**: filenames are the photographer's own labels and are sometimes wrong for the
frame (a `kopan` file may plainly be somewhere else). Describe what you see; only name a place
in `title`/`description`/`text` where you are confident.

**Cover**: pick the strongest frame that is already in `items`, and prefer landscape —
it is used as the album card and the share image.

### 4. Register it on the home page

Add the folder name to `posts` in `src/albums/index.js`, newest-first ordering.
Omitting it is not a build error — the page just won't be linked from the index.

### 5. Verify

```bash
npm run build
```

Slow (~7 min for 60 photos — it generates every responsive variant), but it is the only thing
that validates manifest paths and schema. Expect `[build] N page(s) built`; a bad `src` or a
stray schema field fails the build loudly.
