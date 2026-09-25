---
name: publish-album
description: Finish a drafted album and put it on the home page — register it in the index, check the writing against UK English, fix punctuation and capitalisation in captions, and warn about monotonous stretches of photo blocks. Use when asked to publish an album, or when a manifest in src/albums/<album>/ is written and ready to go live.
---

# Publishing an album

Input: an album folder whose `manifest.js` is written — usually by `draft-album`, with captions
from `flora-id` and any quotes from `quote-find`. Output: the album on the home page, its
writing checked, and a list of every change made.

This skill edits words and the index. **It never reorders blocks, regroups frames, or changes a
`src`** — if the shape of the album is wrong, that's `draft-album`'s work, not this. Putting a
block's own properties back into house order is the one exception, and it's step 1.

## 1. Put the manifest in house order

```bash
npm run format -- <album-slug> --strip-empty
```

One property per line, and `photos` blocks keyed `type`, `hero`, `closer`, `caption`, `images`.
It rewrites the file in place and leaves comments, and blocks held back behind `//`, exactly
where they were.

**The reordering is silent.** It changes no words and no data — only which line a property sits
on — so it doesn't belong in the report at the end.

**`--strip-empty` is not.** It removes `photos` blocks holding no frames — legal while drafting,
where they hold a slot open, and rendered as nothing — and a removed block is a real change, so
the count goes in the report. If one carried a caption, that caption is gone with it: say which
blocks went, and quote any caption you deleted, in case a line someone wrote was parked there.

## 2. Register it on the home page

**Skip this entirely for a `standalone: true` album.** Standalone albums stay out of
`src/albums/index.js` — see `draft-album`.

Otherwise, look for the slug in `posts` in `src/albums/index.js`:

- **Commented out** (`// '2015-india',` — how `draft-album` leaves it): uncomment it.
- **Absent**: add it in newest-first position, uncommented.
- **Already there, uncommented**: nothing to do. Say so; don't add a second line.

## 3. Check the writing

Read every piece of prose in the manifest: the album `title` and `location`, each `alt`, each
`caption`, and each `subheading` `title` and `text`.

**Never touch the `text` of a `quote` block.** Those are someone else's words, reproduced;
a spelling you'd "correct" is the source's, and fixing it makes the quote wrong. Its
`attribution` is yours to capitalise, but the quotation itself is untouchable.

### UK English

The whole site is UK English, and `draft-album` writes it that way, so this is a backstop:
`colour`, `harbour`, `terraced`, `grey`, `travelling`, `-ise` endings (`recognise`,
`organised`). Also the vocabulary — `autumn` not `fall`, `pavement` not `sidewalk`.

### Spelling and grammar

Fix what's plainly wrong: a typo, a missing word, a broken agreement, a doubled space. Where a
line is ambiguous — a place name you can't confirm, a sentence that might be deliberate, a
phrase where the fix changes the meaning — **leave it alone and ask**, quoting the line and the
block number. Don't smooth someone's voice into your own.

### Captions and attributions, mechanically

Run the audit, which lists every caption and quote attribution that breaks either rule:

```bash
node .claude/skills/publish-album/audit.mjs <album-slug>
```

- **Every caption ends in a punctuation mark.** Missing one, add a full stop. A caption already
  ending in `?`, `!` or `…` is fine as it is. This is captions only — an attribution is a name
  and a title, not a sentence, and takes no full stop.
- **Every caption and every quote attribution starts with a capital.**
- **Flora captions follow the fixed form** set out in `flora-id`: `1: Foxglove. 2: Roseroot.`
  — the marker is `<n>:` and never `(<n>)`, and every entry closes with a full stop. The audit
  catches those two.

The audit reports; you make the edits.

**One flora rule the audit can't see:** common names are sentence case, with a capital only on
the entry's first word, while a genus name keeps its capital wherever it falls. `2: A pale
Cladonia.` is right and `2: Angel's Trumpet tree.` is wrong, and no regex can tell the two
apart. Read the flora captions yourself and fix the Title Case by hand.

### Print the changes

One list, in block order, before you finish:

```
[6]  caption     — added a full stop
[6]  caption     — "test" → is this a placeholder? (asked, not changed)
[14] alt         — "colorful" → "colourful"
[22] subheading  — "Lienden the harbor" → "Lienden the harbour"
[31] attribution — "nan shepherd" → "Nan Shepherd"
```

A block with no change doesn't appear. If nothing changed, say so in a line.

## 4. Warn about the rhythm

The same audit prints both of these. They are **warnings, not fixes** — never regroup blocks to
clear one. Report them and let the owner decide.

- **More than 12 photo blocks in a row** with nothing between them to break the run. The audit
  names the count, the block range, and the subheading the run sits under. The fix is usually a
  subheading the album is missing, or a quote.
- **The same photo-block shape twice or more in a row** — two adjacent blocks of three frames
  with `hero: true`, say. A block of one frame is the album's baseline rhythm, so it doesn't
  count as a shape — neither `hero` nor `closer` changes a single frame. Only blocks with
  several frames do, and the flags count as part of the shape there.

## 5. Orphaned media

The audit's orphan section lists every file in `media/` that nothing in the manifest points at —
frames, video sources, video posters and the cover all count as pointing at a file.

A file only counts as an orphan if the manifest doesn't name it anywhere, live blocks and
commented-out ones alike. A frame toggled off is being held on purpose, so it is not dead
weight; the audit lists those separately under "switched off" and they are never candidates
for deletion.

These are usually frames dropped while the album was being shaped, and the album is finished,
so they are dead weight. **Never delete them on your own initiative.** Show the owner the list
— filenames and the count — and ask. Delete only what they confirm, and only after they have
seen the actual list, because a confirmation given against a list they haven't read isn't one.

Two things to check before you ask:

- **Is anything on the list a photograph they've shown interest in?** A file that was in the
  manifest earlier in the session, or that they asked about, is more likely to have been
  dropped by accident than on purpose. Say so next to the filename.
- **Is the album committed?** `git ls-files <album>/media` tells you. A tracked file comes back
  with `git checkout HEAD -- <path>`; an untracked one is gone for good. Say which case it is,
  so the owner knows what they're agreeing to.

Delete with `git rm` for tracked files, so the removal is staged along with the manifest.

## 6. Verify

```bash
npm run check
```

Expect `0 errors`. Then confirm the home page: `npm run dev` and look at `/albums/`, where the
album should now appear in the position its line sits in.

## Hand it back

The change list from step 3, the warnings from step 4, and anything you asked about and are
still waiting on. Say plainly if the album went into the index, was already there, or was
skipped as standalone. From step 1, report only frameless blocks removed — the reordering
itself is silent by design.
