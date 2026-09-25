# Lessons

## Never delete media that's only toggled off (2026-09-23)

While tidying `src/albums/2013-iceland/media`, I deleted `jb20130611iceland747.jpg` because the
manifest's live blocks didn't point at it. It was named in a commented-out block — held on
purpose, not dead weight.

**Rule:** a media file is unused only if the manifest source doesn't mention its filename at
all. Commented-out blocks count as a reference. The `publish-album` audit now reads the
manifest as text as well as importing it, and reports switched-off files in their own "KEEP"
section.

## Verify CSS in a rendered page, not in the served stylesheet (2026-09-24)

Asked to drop caption leading, I set `line-height` on `.photos__text` — an inline `<span>` —
confirmed the dev server was serving the rule, and told the user their view must be stale. It
wasn't: an inline box can't pull a line box below its block's strut, so the `<figcaption>`'s
inherited body leading (17px × 1.6 = 27.2px) still governed. The served CSS was right and the
page was wrong.

**Rule:** "the rule is in the stylesheet" is not evidence that it takes effect. Measure the
rendered result — headless Chrome over CDP (`--headless=new --remote-debugging-port=9222`,
driven from node, which has a built-in `WebSocket`) reports computed values and real line
pitch via `Range.getClientRects()`. When a user says a change didn't land, believe the screen
and go measure, rather than explaining why it should have.

**Typography corollary:** put `font-size` and `line-height` on the block that owns the line
box. Setting them on an inline child changes the glyphs but not the spacing.

## Leave the docs true at the end of every run (2026-09-25)

I changed how `hero` blocks lay out, then reported that `README.md` and the `draft-album`
skill still described the old shapes and *offered* to update them. The user had to ask. The
same run had already left the README's "drop in the biggest file you have" advice standing
after capping sources at 2400px, and its phone notes standing after media started bleeding to
the screen edge.

**Rule:** documentation is part of the change, not a follow-up. Before reporting a behaviour
change as done, grep the docs for what it describes and fix every stale line in the same run.
In this repo that means `README.md` (block types, row shapes, the npm script list) and
`.claude/skills/*/SKILL.md` — the skills generate manifests from those descriptions, so a
stale row table produces wrong groupings later. Never end a run with a docs offer; the
question is a tell that the work isn't finished.

## Capture before you destroy, even when a script does the destroying (2026-09-25)

Publishing 2025-sunbirds, step 1 of `publish-album` says to run the formatter with
`--strip-empty` and then report which blocks went and quote any caption that went with them.
I ran it first and read the instruction second. It printed "1 frameless block removed" and
nothing else, the file was already overwritten, and the block wasn't in HEAD — so whatever
caption had been parked there is gone, and I couldn't even say which block it was.

**Rule:** before running anything that deletes, capture what it will delete — `cp` the file, or
run the tool's dry-run mode first. Applies whenever the step's own output contract is "say what
you removed": if the tool doesn't tell you, you have to look before, not after. And when a tool
can't report what it destroyed, that's a gap in the tool — `--strip-empty` now prints the block
number and caption of everything it removes, so the next run can't have this problem.
