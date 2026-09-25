---
name: quote-find
description: Propose quote blocks for a finished album — search out real quotations about what the photographs actually show, present them for approval by reference number, and write in the approved ones. Use when a manifest is final, or when asked to find or suggest quotes for src/albums/<album>/.
---

# Finding quotes for an album

Input: an album folder whose `manifest.js` is drafted (see `draft-album`) and whose blocks are
final. Output: a list of candidate quotes for
the user to approve, then `quote` blocks for the ones they pick. Nothing else in the manifest
changes — not the order, not the grouping, not one `alt` or `caption`.

**Nothing is written until the user approves it.** The whole middle of this skill is a
proposal; the writing is the last step.

## 1. Harvest the subjects

Read `manifest.js` and pull out what the album is actually about. The sources, in order of how
much they're worth:

- **`alt` text** — the specific nouns. `"Boudhanath stupa at dusk"`, `"an elm in a bare field"`,
  `"fishing boats drawn up on black sand"`. This is the richest seam: it names things.
- **Flora captions** — species names, if `flora-id` has already run.
- **`location` and `title`** — the region, the country.
- **`subheading` titles** — places and days.

Write out a short list of subjects worth searching: places, species, landscape types,
recurring activities. Drop anything too generic to find a good quote about ("a path", "the
sky"); keep what's specific enough to have been written about — Sicily, elm, Boudhanath, black
sand, monsoon, olive terraces.

## 2. Search for real quotations

`WebSearch` each subject worth pursuing. The register to aim for: **ecologists, romantics,
travellers** — writers who looked hard at a place and wrote it down.

In the vein of Robert Macfarlane, Nan Shepherd, Anthony Bourdain, Roger Deakin, Rachel Carson,
Barry Lopez, Dorothy Wordsworth, Gilbert White, Bashō, Freya Stark, Patrick Leigh Fermor,
Colin Thubron, Bruce Chatwin, Peter Matthiessen, Gerald Durrell, John Muir, Jan Morris.
Historic and literary sources over contemporary ones; a naturalist's field note over an
aphorism; anyone who was actually there over anyone being quotable.

### Read the source, not just the sentence

Before a quote goes on the list, look at what surrounds it and what else the author wrote.
**Drop the whole source if the text is fundamentally racist** — colonial-era travel writing and
ethnographic survey are full of it, and the good sentences sit inches from racial contempt.

Do not cherry-pick: a lovely line about a temple doesn't come loose from a book that describes
the people at that temple as filth. Trimming the slur out of a sentence to make it usable is
the clearest sign the source has to go. Check the passage the quote sits in, and grep the text
for the usual vocabulary (`savage`, `barbarous`, `filthy`, `degraded`, `inferior race`,
`uncivilized`) — then read the hits, because the word may be describing an elephant or a
specific person rather than a people.

This cuts most of the Victorian canon. Go to writers who were not doing that, and to **writers
from the place itself** — they are the first place to look, not the fallback.

**Never invent a quotation, and never guess at an attribution.** A quote goes on the list only
when the search actually turned it up with a named source. If you can only half-confirm it —
the words are everywhere but no one names the book — either say so in the relevance column or
drop it. A misattributed quote is worse than no quote.

Keep them short: **one or two sentences, and under about 35 words.** Past that the block starts
to fight the page, and for anything still in copyright a longer extract stops being fair use.
Never a whole poem, never a verse of one.

Inside that limit, **prefer the whole sentence to a clipped one**. A fragment that needs its
other half to mean anything is not a quote — if the sense runs to the end of the sentence, take
the sentence. The quote block sizes down before it clips.

Find more than you need — aim for **6–10 candidates** for a full album, spread across it
rather than clustered in one day. Never more than one per day.

## 3. Work out where each would sit

Placement rules, which are absolute:

- **Between two `photos` blocks.** A quote interrupts the plates; that's the whole effect.
- **Never next to a `subheading`** — not immediately before it, not immediately after. A
  chapter opening and a quote fight each other.
- **Never two quotes in a row**, and nothing between two quotes but at least one photo block.

Refer to positions by the block numbers the dev server prints (`?debug`), or by the `src` of
the photo the quote would follow — whichever is clearer.

## 4. Present the candidates

One table, nothing else. Do not write anything into the manifest yet.

| # | Relevance | Quote | Source | Verified | Placement |
| --- | --- | --- | --- | --- | --- |
| 1 | Boudhanath, day 2 | "…" | Colin Thubron, *To a Mountain in Tibet* (2011) | No — Goodreads only | After block 14 |
| 2 | The elm in the bare field | "…" | Robert Macfarlane, *The Wild Places* (2007) | Yes — publisher extract | After block 31 |

- **#** — a reference number, so the user can answer "yes to 1+4".
- **Relevance** — the subject it was found for, and the frames it speaks to.
- **Quote** — exactly as it will appear in the manifest.
- **Source** — author, work, year.
- **Verified** — **Yes** only when the wording was checked against the text itself: a full text, a
  publisher or archive extract, a search-inside result. **No** for anything resting on
  quote-aggregator sites, with a few words on what it rests on instead. Include the unverified
  ones — flagged, never dropped silently — and let the user make the call.
- **Placement** — where it lands, in terms of the blocks either side.

Say plainly in the notes under the table if a quote is a fragment of a longer sentence, and
what was trimmed. A truncation that changes what the sentence was doing is not a quote.

Then stop and wait. The user replies by number.

## 5. Write in the approved ones

Only the numbers they approved. For each:

```js
{
  type: "quote",
  text: "The mountain does not reveal itself to the hurried.",
  attribution: "Nan Shepherd, The Living Mountain",
  url: "https://example.com/source",
}
```

- `attribution` — author, then work. No year, no page; the table carried that for the user's
  decision, the page doesn't need it.
- `url` — optional, and only when there's a **stable, specific page** for the quote: a
  publisher, an archive, a full text. Not a search result, not a quote-aggregator site. Leave
  it off rather than link to something flimsy. `url` without `attribution` is a build error.

Re-check the placement rules after every insertion — inserting one quote moves every block
number after it, and two approved quotes that were three blocks apart can end up adjacent.

## 6. Verify

```bash
npm run check
```

Expect `0 errors`.

## Hand it back

Which numbers went in and where. Then anything you dropped at step 2 and why, and any
approved quote you had to place differently from what the table proposed.
