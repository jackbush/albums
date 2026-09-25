---
name: flora-id
description: Identify the plants, fungi and lichens in an album's flora blocks and write their captions into manifest.js. Use when a manifest's flora blocks are final, or when asked to ID or caption the flora in src/albums/<album>/.
---

# Identifying an album's flora blocks

Input: an album folder whose `manifest.js` is finished. Output: a `caption` on each flora
block. Nothing else in the manifest changes — not the order, not the grouping, not one `alt`.

## 1. Find the blocks

A flora block is a `photos` block of close-ups sitting immediately before the next day's
`subheading` block, or at the end of `items`. The `alt` text names what it holds. Days with no
close-ups have no flora block.

## 2. Look at the originals

The manifest pass works from 512px previews. Identification doesn't. Per frame:

```bash
ALBUM=src/albums/<album>
sips -Z 1400 "$ALBUM/media/X.jpg" --out "$SCRATCHPAD/id_X.jpg"        # whole frame
sips -c 1400 1400 "$ALBUM/media/X.jpg" --out "$SCRATCHPAD/id_X_c.jpg" # centred full-res crop
```

Read both, one frame at a time. The crop is where the diagnostic detail is: leaf margin and
venation, hair, apothecia, gill attachment, stipe base.

## 3. Constrain before naming

- **Where**: the album `location`, its title, and the surrounding `alt` text.
- **When**: the day's `subheading` block.
- **Habitat and altitude**: what's in the frame — bog, scree, birch wood, turf, bare rock, and
  what the subject is growing on.

Check a candidate's range and season against that. `WebSearch` for regional floras and lichen
keys is expected, not a fallback.

## 4. Confidence

Name a species only where the diagnostic features are actually visible. Otherwise give the
rank you are sure of — `Cladonia sp.`, `a hawkweed`, `a crustose lichen`. Never invent a name
to fill the slot: a coarse name is right, a wrong name is wrong.

## 5. Write the caption

One caption per block, frames numbered by position — the same numbering the full-screen viewer
prints as `(2/3)`:

```js
caption: "1: Mountain bootstrap lichen. 2: Pixie cup and reindeer lichens. 3: Alpine bearberry.",
```

**The form is fixed**, so flora captions read the same in every album. `publish-album` checks
the mechanical half of it.

| Rule | Yes | No |
| --- | --- | --- |
| The frame marker is `<n>:` — digit, colon, one space | `1: Foxglove.` | `(1) Foxglove.` |
| Every entry closes with a full stop, the last one included | `1: Foxglove. 2: Roseroot.` | `1: Foxglove, 2: Roseroot` |
| One space between entries, after the full stop | `1: Foxglove. 2: Roseroot.` | `1: Foxglove.2: Roseroot.` |
| Common names are sentence case — a capital on the entry's first word, nowhere else | `2: Angel's trumpet tree.` | `2: Angel's Trumpet Tree.` |
| Scientific names keep their own capitals: genus up, species epithet down | `1: A brittlegill (Russula sp.).` | `1: A brittlegill (russula sp.).` |

A genus name doing the work of a common name is still a genus name, so it keeps its capital
wherever it falls in the entry: `2: A pale Cladonia.` — and `1: Casuarina trees.` That is the
one case where an interior capital is right, which is why the capitalisation rule can't be
checked by machine and has to be read.

Several species in one frame: list them in one entry, as in frame 2 above. Latin only where
there's no settled common name.

Edit the `caption:` line of flora blocks and nothing else. Every other block keeps
`caption: false`.

## 6. Verify

```bash
npm run check
```

Expect `0 errors`.

## Hand it back

Per frame: the name, the confidence, and the feature that decided it. List separately anything
left at genus or group, and what would settle it.
