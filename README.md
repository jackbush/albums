# Albums

A static site for photo albums. No CMS — every post is a folder of media plus a
`manifest.js`, and the site is rebuilt from those files.

```bash
npm install
npm run dev      # http://localhost:4321/albums/
npm run build    # writes dist/
npm run preview  # serves dist/ at the real base path
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
  title: 'Jack Bush | Albums',
  heading: 'Albums',
  description: 'Just nice, old-fashioned photo albums. …',
  cover: './home-cover.jpg',

  posts: [
    '2019-purbeck',
    // 'japan-2023',
  ],
};
```

- A slug here with no matching folder is a **build error**.
- A folder that isn't listed just doesn't appear on the home page. You get a build warning, and
  **its page still builds at its own URL**. Useful for private/draft albums.

---

## `manifest.js`

```js
/** @type {import('../../lib/schema').AlbumManifest} */
export default {
  title: 'Purbeck Bimble',
  description: 'A birthday treat on gravel.',
  date: 'April 2019',
  cover: './media/DSCF0802.jpg',

  items: [
    { type: 'text', text: 'Gorse everywhere, out for weeks and still going.' },
    { type: 'photos', images: [{ src: './media/DSCF0678.jpg', alt: 'Grinning into the wind' }] },
    // { type: 'photos', images: [{ src: './media/DSCF0689.jpg', alt: 'Maybe later' }] },
    {
      type: 'quote',
      text: 'Like man, slighted and enduring.',
      attribution: 'Thomas Hardy',
      attributionLink: 'https://www.gutenberg.org/files/122/122-h/122-h.htm',
    },
  ],
};
```

**Keep that first `@type` line.** It's what makes your editor autocomplete block types and
underline a bad field as you type, before you ever run a build. Copy it into every new manifest,
adjusting `../../` if your file sits at a different depth.

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Shown on the index and as the page heading. |
| `description` | yes | One or two lines. Used on the index and as the page's meta description. |
| `date` | yes | **Free-form display string.** `'April 2019'`, `'Summer 2024'`, `'2023-2024'` are all fine — it's never parsed or sorted on. |
| `cover` | yes | Image shown on the home page. |
| `items` | yes | The post itself, rendered in order. At least one. |
| `theme` | no | Per-post colour and font overrides. See below. |

### Media paths

**Every media path is relative to the manifest** and must start with `./`:

```js
src: './media/DSCF0678.jpg'
```

Supported: **jpg**, **png**, **gif** for images; **mp4**, **webm**, **mov** for video.

---

## Block types

### `photos`

One to six photographs. One is the ordinary case — the frame fills the column:

```js
{
  type: 'photos',
  images: [{ src: './media/cliffs.jpg', alt: 'The chalk cliff at Old Harry, white against a grey sea' }],
  caption: 'Old Harry, an hour before the rain.',
}
```

More than one lays out as rows, under a single caption:

```js
{
  type: 'photos',
  images: [
    { src: './media/doorway.jpg', alt: 'A monk stepping through a red doorway' },
    { src: './media/lamps.jpg', alt: 'Rows of butter lamps burning in a dark hall' },
    { src: './media/steps.jpg', alt: 'Worn steps climbing between two brick walls' },
  ],
  caption: 'Kopan, the hour before the morning session.',
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `images` | yes | One to six. Each takes a `src` relative to the manifest, and its own `alt`. |
| `caption` | no | One line under the whole block. `false` means "not written yet" — same as leaving it out, but keeps the slot. |
| `hero` | no | `false`. Gives the first image a full-width row of its own. No effect on a block of one. |

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

#### Rows

The count fixes the rows — nothing in the manifest chooses them:

| Images | Rows | Rows with `hero` |
| --- | --- | --- |
| 1 | 1 | 1 |
| 2 | 2 | 1 + 1 |
| 3 | 3 | 1 + 2 |
| 4 | 2 + 2 | 1 + 3 |
| 5 | 3 + 2 | 1 + 2 + 2 |
| 6 | 2 + 2 + 2 | 1 + 3 + 2 |

With `hero: true` the first image takes the full column width on its own — the width a block
of one gets — and the images after it fall into the rows for one fewer frame.

Within a row, widths are set in proportion to each frame's aspect ratio, so the frames land on
a common height and fill the column exactly, uncropped — any mix of portrait and landscape
works. **Below 720px the rows collapse and every frame runs full width.**

### `video`

```js
{ type: 'video', src: './media/descent.mp4', poster: './media/descent-still.jpg', alt: 'Dropping off the ridge' }
```

| Field | Required | Default | Notes |
| --- | --- | --- | --- |
| `src` | yes | | `.mp4`, `.webm` or `.mov`, relative to the manifest. |
| `poster` | no | | Still shown before playback. An image path. |
| `alt` | no | | Description, shown beside the caption. |
| `loop` | no | `false` | Repeat when it ends. |
| `muted` | no | `false` | Start silent. |
| `autoplay` | no | `false` | Plays on load. Implies muted and looping, and hides the controls — browsers won't autoplay sound, so this is for short ambient clips. |

**Videos aren't transcoded.** Export them web-ready: H.264 mp4, around 1080p. Videos aren't
numbered as plates and don't open full screen — they play in place.

### `quote`

```js
{ type: 'quote', text: '…', attribution: 'Thomas Hardy', attributionLink: 'https://…' }
```

| Field | Required | Notes |
| --- | --- | --- |
| `text` | yes | Set large and centred. |
| `attribution` | no | Shown beneath. |
| `attributionLink` | no | Makes the attribution a link. Must be a full URL. Ignored without `attribution`. |

### `text`

```js
{ type: 'text', text: 'First paragraph.\n\nSecond paragraph.' }
```

Plain prose. Blank lines (`\n\n`) become paragraphs. **Not markdown** — `**bold**` renders as
literal asterisks.

---

## Theming a post

Optional. Every key is optional; anything you leave out keeps the default.

```js
  theme: {
    background: '#0e0e10',
    accent: '#ff5c00',
    textPrimary: '#f5f5f5',
    textSecondary: '#a0a0a0',
    textTitle: '#ffffff',
    textLink: '#ff5c00',
    fontBody: 'Inter',
    fontHeading: 'Fraunces',
  },
```

| Key | Default |
| --- | --- |
| `background` | `#fafafa` |
| `accent` | `#0000ff` |
| `textPrimary` | `#222222` |
| `textSecondary` | `#444444` |
| `textTitle` | falls back to `textPrimary` |
| `textLink` | falls back to `accent` |
| `fontBody` | IBM Plex Sans |
| `fontHeading` | IBM Plex Serif |

Fonts are **Google Fonts family names**, spelled as Google spells them: `'Fraunces'`,
`'Space Grotesk'`, `'EB Garamond'`. The two IBM Plex defaults ship with the site, so the
common case makes no external request; naming any other family adds a Google Fonts link to
that page only.

A theme applies to that post's page only — the home page always uses the defaults.

Hairlines and rules are drawn from `accent` at low opacity, so changing the accent
re-tints the whole page's ruling. This is deliberate: the accent is the interface, and the
photographs supply the rest of the colour.

---

## Home page and site metadata

Everything the home page needs — its title, heading, description and share image — sits at the
top of [`src/albums/index.js`](src/albums/index.js), above the album list:

```js
export default {
  title: 'Jack Bush | Albums',
  heading: 'Albums',
  description: "Just nice, old-fashioned photo albums. …",
  cover: './home-cover.jpg',
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

**Album pages take all of this from their own `manifest.js`** — `title`, `description` and
`cover`. Edit the manifest and the album page, its card on the home page and its link preview
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
