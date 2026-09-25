# Albums

A static site for photo albums. No CMS — every post is a folder of media plus a
`manifest.js`, and the site is rebuilt from those files.

```bash
npm install
npm run dev      # http://localhost:4321/albums/
npm run build    # writes dist/
npm run preview  # serves dist/ at the real base path
npm run compress # fits album sources to the largest size the site serves
npm run format   # puts manifests in house order (one property per line)
```

---

## Adding an album

1. Make a folder under `src/albums/`. **The folder name is the URL** —
   `2019-purbeck/` publishes at `/albums/2019-purbeck/`.
2. Put your media inside it. A `media/` subfolder keeps things tidy but isn't required.
3. Write a `manifest.js` in the folder (see below).
4. Add the folder name to `posts` in [`src/albums/index.js`](src/albums/index.js).

### Folder names

Lowercase letters, numbers and single hyphens: `2019-purbeck`, `japan`, `peak-district-2022`.
Anything else fails the build with a message naming the folder. Renaming a folder changes the
URL, so treat it as permanent once you've shared a link.

---

## `src/albums/index.js`

Holds the home page's own settings (see [Home page and site
metadata](#home-page-and-site-metadata)) and controls **which** albums appear on it and **in
what order**. First in the list is first on the page.

```js
/** @type {import('../lib/schema').HomeManifest} */
export default {
  title: "Jack Bush | Albums",
  heading: "Albums",
  description: "Just nice, old-fashioned photo albums. …",
  cover: "./home-cover.jpg",

  posts: [
    "2019-purbeck",
    // "japan-2023",
  ],
};
```

- A slug here with no matching folder is a **build error**.
- A folder that isn't listed just doesn't appear on the home page. You get a build warning, and
  **its page still builds at its own URL**. Useful for private/draft albums.
- A `standalone` album is meant to be unlisted, so it doesn't warn. Don't list it here at all,
  not even commented out.

---

## `manifest.js`

```js
/** @type {import('../../lib/schema').AlbumManifest} */
export default {
  title: "Purbeck Bimble",
  location: "Dorset, UK",
  year: "2019",
  cover: "./media/DSCF0802.jpg",

  items: [
    {
      type: "quote",
      text: "Gorse everywhere, out for weeks and still going.",
      attribution: "Ben",
    },
    {
      type: "photos",
      caption: false,
      images: [
        {
          src: "./media/DSCF0678.jpg",
          alt: "Grinning into the wind",
        },
      ],
    },
    // {
    //   type: "photos",
    //   caption: false,
    //   images: [
    //     {
    //       src: "./media/DSCF0689.jpg",
    //       alt: "Maybe later",
    //     },
    //   ],
    // },
    {
      type: "subheading",
      title: "Old Harry",
      text: "Chalk, and a headwind that stopped us dead",
    },
  ],
};
```

**One property per line**, however short — never an inline object. Manifests are edited by hand
far more than they are read, and a property alone on its line is one you can change, comment out
or move without picking a line apart first. A `photos` block keys in a fixed order too:
`type`, `hero`, `closer`, `caption`, `images` — the flags that get edited sit together above the
long array of paths rather than either side of it. `npm run format` puts a manifest into both,
and `publish-album` runs it over an album before publishing.

**Keep that first `@type` line.** It's what makes your editor autocomplete block types and
underline a bad field as you type, before you ever run a build. Copy it into every new manifest,
adjusting `../../` if your file sits at a different depth.

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Shown on the index and as the page heading. |
| `location` | yes | **Free-form.** A country, or a region and country: `'Norway'`, `'Dorset, UK'`. |
| `year` | yes | A year, or a range of two: `'2019'`, `'2014-15'`, `'2014-2015'`. Validated on that shape, but never parsed or sorted on. |
| `cover` | yes | Image shown on the home page. |
| `items` | yes | The post itself, rendered in order. At least one. |
| `standalone` | no | `false`. `true` drops the "← Albums" bars above and below the post, leaving the page with no link back to the site. See below. |
| `theme` | no | Per-post colour and font overrides. See below. |

### Media paths

**Every media path is relative to the manifest** and must start with `./`:

```js
src: "./media/DSCF0678.jpg"
```

Supported: **jpg**, **png**, **gif** for images; **mp4**, **webm**, **mov** for video.

Any subfolder works, not just `media/`. The one with a meaning attached is **`b-roll/`**: an
album that has one is saying it has a pile of phone pictures to close a section with, and
they belong in a [`b-roll`](#b-roll) block rather than scattered through the `photos` ones.

---

### Standalone albums

```js
standalone: true,
```

A post you share by link alone — an unlisted album, a walkthrough, anything that isn't part of
the collection. It renders exactly like any other post, minus the "← Albums" bar at the top and
the one at the bottom, so the page doesn't hand the reader a route into the rest of the site.
Nothing hides it from someone who has the URL; it's unlisted, not private.

---

## Block types

### `photos`

One to six photographs. One is the ordinary case — the frame fills the column:

```js
{
  type: "photos",
  caption: "Old Harry, an hour before the rain.",
  images: [
    {
      src: "./media/cliffs.jpg",
      alt: "The chalk cliff at Old Harry, white against a grey sea",
    },
  ],
}
```

More than one lays out as rows, under a single caption:

```js
{
  type: "photos",
  caption: "Kopan, the hour before the morning session.",
  images: [
    {
      src: "./media/doorway.jpg",
      alt: "A monk stepping through a red doorway",
    },
    {
      src: "./media/lamps.jpg",
      alt: "Rows of butter lamps burning in a dark hall",
    },
    {
      src: "./media/steps.jpg",
      alt: "Worn steps climbing between two brick walls",
    },
  ],
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `images` | yes | One to six. Each takes a `src` relative to the manifest, and its own `alt`. |
| `caption` | no | One line under the whole block. `false` means "not written yet" — same as leaving it out, but keeps the slot. |
| `hero` | no | `false`. Gives the first image a row of its own. Two exceptions, both below: a block of two shares one row, and an upright first image builds a rectangle with two frames stacked beside it. No effect on a block of one. |
| `closer` | no | `false`. The same for the last image: it closes the block on a row of its own. Combines with `hero` to bracket the block. No effect on a block of one. |

`alt` and `caption` do different jobs: `alt` describes what is in the frame for someone who
can't see it — screen readers and the full-screen viewer, never printed on the page — while
`caption` says the thing worth saying to someone who can. Write both, or write neither; they
aren't substitutes and neither falls back to the other.

Every frame is a **plate**. Plates take consecutive numbers across the whole album (`02–04`
under a block of three), which is the number the full-screen viewer shows and the count on the
home page. Click any frame to open it full screen. Where a block holds more than one, each
slide repeats the block's caption with its position appended — `Kopan, the hour before the
morning session. (2/3)`.

Drop in the biggest file you have; the build makes the resized versions. **GIFs are passed
through untouched** to keep them animating — resizing an animated GIF would flatten it to one
frame, so export GIFs at the size you want them, around 1000px wide.

Nothing beyond **2400px on the long edge** ever reaches a visitor, though. That's `PLATE_CAP`
in `src/lib/media.ts` — the size of the full-screen plate, and the largest image the site
serves; every inline width is smaller. Pixels past it are resized away on every build and
cost only repository size, so once an album is final, `npm run compress` fits its sources
inside that box in place. It keeps EXIF, skips anything already within the cap, and is safe to
re-run. It is also lossy and irreversible — keep the true originals somewhere outside the repo.

#### Rows

The count fixes the rows — nothing in the manifest chooses them:

| Images | Rows | with `hero` | with `closer` | with both |
| --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 1 | 1 |
| 2 | 2 | 2 (⅔ + ⅓) | 1 + 1 | 1 + 1 |
| 3 | 3 | 1 + 2 | 2 + 1 | 1 + 1 + 1 |
| 4 | 2 + 2 | 1 + 3 | 3 + 1 | 1 + 2 + 1 |
| 5 | 3 + 2 | 1 + 2 + 2 | 2 + 2 + 1 | 1 + 3 + 1 |
| 6 | 2 + 2 + 2 | 1 + 3 + 2 | 3 + 2 + 1 | 1 + 2 + 2 + 1 |

And the same on a phone, where a row never runs more than two across:

| Images | Phone | with `hero` | with `closer` | with both |
| --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 1 | 1 |
| 2 | 2 | 1 + 1 | 1 + 1 | 1 + 1 |
| 3 | 2 + 1 | 1 + 2 | 2 + 1 | 1 + 1 + 1 |
| 4 | 2 + 2 | 1 + 2 + 1 | 2 + 1 + 1 | 1 + 2 + 1 |
| 5 | 2 + 1 + 2 | 1 + 2 + 2 | 2 + 2 + 1 | 1 + 2 + 1 + 1 |
| 6 | 2 + 2 + 2 | 1 + 2 + 1 + 2 | 2 + 1 + 2 + 1 | 1 + 2 + 2 + 1 |

With `hero: true` the first image takes the full column width on its own — the width a block
of one gets — and the images after it fall into the rows for one fewer frame. `closer: true`
does the same at the other end, giving the last image a row of its own. Set both and the block
is bracketed: a plate, the shapes for whatever sits between, then a plate.

A hero block of **two** is the exception: the pair shares a single row rather than stacking,
the hero holding two thirds of the column and the second frame the last third. The seam
between them lands on the right-hand gutter of an evenly spaced band of three, so a hero pair
and a band of three set one above the other line up down the page. These two are cut to fixed
widths rather than to a common height, so they hang from a shared bottom edge and the tops
stagger. A phone still stacks them — a third of a phone column is the thumbnail the narrow
shapes exist to avoid. Adding `closer` overrides the split — asking for the last frame on a
row of its own is asking for the two to stack, which is the one way to get two full-width
plates one above the other.

A hero block of **three or more whose first image is upright** is the other exception, and it
ignores the `hero` column above. A full-width upright plate is a tower, so instead the first
three frames build one rectangle — the hero down the left, two frames stacked on the right,
both columns ending on the same line. Anything past the third falls into ordinary rows
underneath:

| Images | Rows, upright hero |
| --- | --- |
| 3 | rectangle |
| 4 | rectangle + 1 |
| 5 | rectangle + 2 |
| 6 | rectangle + 3 |

The two column widths are solved rather than fixed: the rectangle only closes if the hero and
the stack finish at the same height, and no frame is cropped to get there, so the widths fall
out of the three aspect ratios and the gutter between the stacked pair. A very tall hero takes
a narrow column and gives the stack the rest; two upright frames in the stack push the balance
the other way. A phone ignores all of this and uses the narrow shapes in the table.

The rectangle and a `closer` compose: the rectangle takes the first three frames, the closer
the last, and anything between flows in ordinary rows. That needs four frames or more — at
exactly three the closer has claim on the last frame, so the rectangle gives way and the block
reads 1 + 1 + 1.

An **upright image alone on its row** stops at the same two-thirds band a hero pair uses,
left-aligned, with the last third of the row empty. That covers a block of one, an upright
`closer`, and an upright `hero` in the cases where the rectangle doesn't apply — anywhere an
upright would otherwise tower at the full width of the column. Where the block is a single
frame, its caption stops with it; in a longer block the caption keeps the full measure. On a
phone the frame runs full width like any other.

Within a row, widths are set in proportion to each frame's aspect ratio, so the frames land on
a common height and fill the column exactly, uncropped — any mix of portrait and landscape
works. **Below 720px a row never runs more than two across**, so a band of three doesn't
shrink to thumbnails; where that leaves an odd frame, it goes last and takes the full width.

#### On a phone

Below 720px the photographs break out of the page margin and run to the screen edge, and the
gutters inside a block halve, in both directions. Everything set in type — chapters, quotes,
the page head, the caption under a block — stays inset on the container's measure, which drops
from 16px to 10px at the same breakpoint. The album covers on the home page bleed the same
way, with their titles and stamps holding the inset.

### `b-roll`

A grid for the pictures that didn't make the album but shouldn't be thrown away — the phone
shots, the snaps off the second camera — dumped at the end of a section rather than worked
into it. Where a `photos` block composes, this one just lays them out.

```js
{
  type: "broll",
  images: [
    {
      src: "./b-roll/DSC_0006.jpg",
      alt: "A woman on a balcony above palms and banana trees",
    },
    // …eleven more
  ],
  caption: "Lombok and the Gilis, mostly off the little camera.",
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `images` | yes | **A multiple of six.** Each takes a `src` and its own `alt`, same as `photos`. |
| `caption` | no | One line under the whole grid. `false` means "not written yet". |

Three across on a wide screen, **two on a phone** — six divides both, which is why the count
has to be a multiple of it: neither width is ever left with a short last row. There are no row
shapes to choose and no `hero`; every frame is the same size, on the same gutter as everything
else in the column, so a b-roll grid lines up with a `photos` band of three above it.

**Every frame is cropped to one aspect ratio**, taken from the first image in the block. An
even field is the whole point of the block, and the full-screen viewer still holds the uncut
frame, so nothing is really lost — but feed it frames that are already the same shape. Mixing
a portrait into a landscape grid will cost that picture its top and bottom, and the build
prints a warning naming the files it had to crop.

Frames are plates like any other: they take their place in the numbered sequence, open full
screen, and each slide repeats the block's caption with its position appended.

### `video`

```js
{
  type: "video",
  src: "./media/descent.mp4",
  poster: "./media/descent-still.jpg",
  alt: "A skier dropping off a corniced ridge into shadow",
  caption: "The last good line of the week.",
}
```

`alt` and `caption` do the same two jobs here as on a `photos` block: `alt` describes the film
for someone who can't see it and is never printed, `caption` is the line printed under it.

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| `src` | yes | | `.mp4`, `.webm` or `.mov`, relative to the manifest. |
| `poster` | no | | Still shown before playback. An image path. |
| `alt` | no | | Describes the film for screen readers. Never printed on the page. |
| `caption` | no | | One line under the film, exactly like a `photos` caption. `false` means "not written yet". |
| `loop` | no | `false` | Repeat when it ends. |
| `muted` | no | `false` | Start silent. |
| `autoplay` | no | `false` | Plays on load. Implies muted and looping — browsers won't autoplay sound. See below. |

An autoplaying film is **ambient**: it drops the native controls and keeps a single
mute/unmute button in the bottom corner of the frame, so the sound is there to be asked for
rather than sprung on anyone. It starts muted, which is the only way a browser will start it
at all; tapping the button counts as the gesture that buys permission for sound, on phones as
well as desktops. Playback is tied to the film being on screen — it starts a little before it
scrolls into view and pauses when it leaves, so a film further down the page costs nothing
until you reach it. Where autoplay is refused outright (iOS in Low Power Mode), the native
controls come back and the button goes away.

**Videos aren't transcoded.** Export them web-ready: H.264 mp4, around 1080p. An ambient clip
is downloaded whether or not anyone asks for it, so keep the bitrate sane — 2 Mbps is plenty
at 1080p, and straight-off-the-camera files are often four times that. Videos aren't numbered
as plates and don't open full screen — they play in place.

### `subheading`

Opens a chapter — a place, a day, whatever the album divides on.

```js
{ type: 'subheading', title: 'Udaipur', text: 'A city built around its own reflection' }
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | The chapter line. Set in the heading face, left-aligned, about half the size of the post title. |
| `text` | no | A line of body text under it. Blank lines (`\n\n`) become paragraphs. |

A chapter takes twice the usual block gap above it and the usual one below, so it
reads as the opening of the plates that follow. A chapter in the first position sits tight
under the title instead.

### `quote`

```js
{
  type: "quote",
  text: "A city built around its own reflection.",
  attribution: "Someone Who Said It",
  url: "https://example.com/where-they-said-it",
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `text` | yes | The quote. Set in the heading face between big quotation marks, centred, one step down from a `subheading` title. |
| `attribution` | no | Who said it, centred under the quote in the same style as a chapter's `text`. |
| `url` | no | Makes the attribution a link, styled like any other link on the page. Without an `attribution` to hang on it's a **build error**. |

A narrow column — half the page on desktop, 90% on a phone — so the quote reads as a break in
the sequence rather than more of it. Marked up as a real `<blockquote>` and `<cite>`, with the
`url` set as the blockquote's `cite` attribute too.

One line of quoted text, not prose: **not markdown**, and no paragraph splitting — `**bold**`
renders as literal asterisks.

---

## Theming a post

Optional. Every key is optional; anything you leave out keeps the default.

```js
  theme: {
    background: "#0e0e10",
    textPrimary: "#f5f5f5",
    textSecondary: "#a0a0a0",
    textTitle: "#ffffff",
    textLink: "#ff5c00",
    fontBody: "Inter",
    fontHeading: "Fraunces",
  },
```

| Key | Default |
| --- | --- |
| `background` | `#fafafa` |
| `textPrimary` | `#222222` |
| `textSecondary` | `#444444` |
| `textTitle` | falls back to `textPrimary` |
| `textLink` | `#0000ff` |
| `fontBody` | IBM Plex Sans |
| `fontHeading` | IBM Plex Serif |

Fonts are **Google Fonts family names**, spelled as Google spells them: `'Fraunces'`,
`'Space Grotesk'`, `'EB Garamond'`. The two IBM Plex defaults ship with the site, so the
common case makes no external request; naming any other family adds a Google Fonts link to
that page only.

A theme applies to that post's page only — the home page always uses the defaults.

`textLink` colours the back link, the film label and the focus ring — every coloured
thing on the page that isn't a photograph.

---

## Home page and site metadata

Everything the home page needs — its title, heading, description and share image — sits at the
top of [`src/albums/index.js`](src/albums/index.js), above the album list:

```js
export default {
  title: "Jack Bush | Albums",
  heading: "Albums",
  description: "Just nice, old-fashioned photo albums. …",
  cover: "./home-cover.jpg",
  posts: [ /* … */ ],
};
```

| Field | Used for |
| --- | --- |
| `title` | The home page's browser tab and share title. |
| `heading` | The masthead, the back link on every album page, and the `— Albums` suffix on album titles. Keep it short. |
| `description` | The home page meta description, and the blurb in a link preview. |
| `cover` | The home page share image. Path relative to `src/albums/index.js`, same `./` rule as album media. |

> **`home-cover.jpg` is a placeholder.** It's a straight copy of
> `src/albums/2011-tibet/media/jb20111204lhasa3.jpg`. Drop a proper image in at
> `src/albums/home-cover.jpg` (or point `cover` somewhere else) when you have one.

**Album pages take all of this from their own `manifest.js`** — `title`, `location`, `year`
and `cover`. Edit the manifest and the album page, its card on the home page and its link preview
all change together; there's nothing to update in a second place.

Every page gets `<title>`, a meta description, a canonical URL, Open Graph and Twitter card
tags. Share images are cropped to 1200×630 at build time, whatever the source shape.

## Favicon

[`public/favicon.svg`](public/favicon.svg) — the Phosphor `camera` icon, fill variant, black on
a white rounded square — is linked from every page, along with `public/apple-touch-icon.png`
for iOS home screens.

The PNG is generated from the SVG, so if you edit the SVG, regenerate it:

```bash
node -e "const sharp=require('sharp'),fs=require('fs');sharp(fs.readFileSync('public/favicon.svg'),{density:600}).resize(180,180).flatten({background:'#ffffff'}).png().toFile('public/apple-touch-icon.png')"
```

---

## Notes

- Manifests are plain ES modules, loaded by the build. They can hold comments, trailing
  commas and multi-line strings, but keep them to a plain exported object — no imports, no
  computed values.
