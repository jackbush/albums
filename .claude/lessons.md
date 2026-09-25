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
