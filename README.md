# Gallery

A static site for trip photographs. No CMS — every post is a folder of media plus a
`manifest.json`, and the site is rebuilt from those files.

```bash
npm install
npm run dev      # http://localhost:4321/gallery/
npm run build    # writes dist/
npm run preview  # serves dist/ at the real base path
```

---

## Adding a trip

1. Make a folder under `src/content/trips/`. **The folder name is the URL** —
   `2019-purbeck/` publishes at `/gallery/2019-purbeck/`.
2. Put your media inside it. A `media/` subfolder keeps things tidy but isn't required.
3. Write a `manifest.json` in the folder (see below).
4. Add the folder name to `posts` in [`src/content/index.json`](src/content/index.json).

### Folder names

Lowercase letters, numbers and single hyphens: `2019-purbeck`, `japan`, `peak-district-2022`.
Anything else fails the build with a message naming the folder. Renaming a folder changes the
URL, so treat it as permanent once you've shared a link.

---

## `src/content/index.json`

Controls **which** trips appear on the home page and **in what order**. First in the list is
first on the page.

```json
{
  "posts": ["2019-purbeck", "japan-2023"]
}
```

- A slug here with no matching folder is a **build error** — it's a typo, and silently dropping
  it would hide a post without telling you.
- A folder that isn't listed just doesn't appear on the home page. You get a build warning, and
  **its page still builds at its own URL**. That's how drafts work: leave a trip out of the list
  while you're putting it together, preview it directly, then add it when it's ready.
  (Unlinked isn't private — the files still ship.)

---

## `manifest.json`

```json
{
  "title": "Purbeck Bimble",
  "description": "A birthday treat on gravel.",
  "date": "April 2019",
  "cover": "./media/DSCF0802.jpg",
  "items": [
    { "type": "text", "text": "Gorse everywhere, out for weeks and still going." },
    { "type": "image", "src": "./media/DSCF0678.jpg", "alt": "Grinning into the wind" },
    {
      "type": "quote",
      "text": "Like man, slighted and enduring.",
      "attribution": "Thomas Hardy",
      "attributionLink": "https://www.gutenberg.org/files/122/122-h/122-h.htm"
    }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Shown on the index and as the page heading. |
| `description` | yes | One or two lines. Used on the index and as the page's meta description. |
| `date` | yes | **Free-form display string.** `"April 2019"`, `"Summer 2024"`, `"2023-2024"` are all fine — it's never parsed or sorted on. |
| `cover` | yes | Image shown on the home page. |
| `items` | yes | The post itself, rendered in order. At least one. |
| `theme` | no | Per-post colour and font overrides. See below. |

There's no `slug` (the folder name is the slug) and no sort field (`index.json` sets the order).

### Media paths

**Every media path is relative to the manifest** and must start with `./`:

```json
"src": "./media/DSCF0678.jpg"
```

This isn't a style preference. It's what lets the build find each file, read its real
dimensions, and generate resized versions. An absolute path like `/DSCF0678.jpg` skips all of
that, so the schema rejects it.

Supported: **jpg**, **png**, **gif** for images; **mp4**, **webm**, **mov** for video.

Unknown fields are rejected, so a typo like `"atribution"` fails the build rather than being
silently ignored.

---

## Block types

### `image`

```json
{ "type": "image", "src": "./media/cliffs.jpg", "alt": "The chalk cliff at Old Harry" }
```

| Field | Required | Notes |
| --- | --- | --- |
| `src` | yes | Path relative to the manifest. |
| `alt` | no | Description for screen readers, also shown beside the plate number. Worth writing. |

Fills the column width. Click to open full screen. Images are numbered as **plates** — the
number under each image is the same number the full-screen viewer shows, and the count on the
home page. Drop in the biggest file you have; the build makes the resized versions.

**GIFs are passed through untouched** to keep them animating — resizing an animated GIF would
flatten it to one frame. So export GIFs at the size you want them, around 1000px wide.

### `video`

```json
{ "type": "video", "src": "./media/descent.mp4", "poster": "./media/descent-still.jpg", "alt": "Dropping off the ridge" }
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

```json
{ "type": "quote", "text": "…", "attribution": "Thomas Hardy", "attributionLink": "https://…" }
```

| Field | Required | Notes |
| --- | --- | --- |
| `text` | yes | Set large and centred. |
| `attribution` | no | Shown beneath. |
| `attributionLink` | no | Makes the attribution a link. Must be a full URL. Ignored without `attribution`. |

### `text`

```json
{ "type": "text", "text": "First paragraph.\n\nSecond paragraph." }
```

Plain prose. Blank lines (`\n\n`) become paragraphs. **Not markdown** — `**bold**` renders as
literal asterisks.

---

## Theming a post

Optional. Every key is optional; anything you leave out keeps the default.

```json
"theme": {
  "background": "#0e0e10",
  "accent": "#ff5c00",
  "textPrimary": "#f5f5f5",
  "textSecondary": "#a0a0a0",
  "textTitle": "#ffffff",
  "textLink": "#ff5c00",
  "fontBody": "Inter",
  "fontHeading": "Fraunces"
}
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

Any CSS colour works — hex, `rgb()`, named colours.

Fonts are **Google Fonts family names**, spelled as Google spells them: `"Fraunces"`,
`"Space Grotesk"`, `"EB Garamond"`. The two IBM Plex defaults ship with the site, so the
common case makes no external request; naming any other family adds a Google Fonts link to
that page only.

A theme applies to that post's page only — the home page always uses the defaults.

Hairlines and rules are drawn from `accent` at low opacity, so changing the accent
re-tints the whole page's ruling. This is deliberate: the accent is the interface, and the
photographs supply the rest of the colour.

---

## Site name

The site title and tagline live in [`src/lib/site.ts`](src/lib/site.ts).

---

## Deploying to GitHub Pages

1. In `astro.config.mjs`, set `site` to your Pages URL and `base` to `/<repo-name>/`.
   They're currently `https://example.github.io` and `/gallery/`.
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
   publishes.

Full-size photographs are committed to the repo, so it will get large. If that becomes a
problem, look at Git LFS before it does.

---

## Notes

- Builds are slow in proportion to how many new full-size images you've added — resizing 24MP
  files takes a while. Results are cached in `.astro/`, so rebuilds are fast.
- The Purbeck post's `text` blocks are placeholder copy written from the photographs. Replace
  them with the real thing.
