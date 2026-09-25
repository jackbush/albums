import { z } from 'astro/zod';

/** Colours accept any CSS colour; we only reject empty strings. */
const cssColour = z.string().trim().min(1);

const mediaPath = z.string().trim().min(1);

export const themeSchema = z
  .object({
    background: cssColour.optional(),
    textPrimary: cssColour.optional(),
    textSecondary: cssColour.optional(),
    /** Falls back to textPrimary. */
    textTitle: cssColour.optional(),
    textLink: cssColour.optional(),
    /** Google Fonts family name, e.g. "Fraunces". */
    fontBody: z.string().trim().min(1).optional(),
    fontHeading: z.string().trim().min(1).optional(),
  })
  .strict();

export type Theme = z.infer<typeof themeSchema>;

/**
 * A caption is the line printed under a block. `false` means "not written yet" — it
 * reads the same as leaving the key out, but keeps the key in the manifest as a slot
 * to come back and fill in.
 */
const caption = z.union([z.string().trim().min(1), z.literal(false)]).optional();

/** One frame of a `photos` block: its own src and alt, no caption of its own. */
const photo = z
  .object({
    src: mediaPath,
    /** Screen readers and the full-screen viewer only; never printed on the page. */
    alt: z.string().optional(),
  })
  .strict();

export const albumManifestSchema = z
  .object({
    title: z.string().trim().min(1),
    /** Where: "Norway", or "Dorset, UK". Printed under the title, in block caps. */
    location: z.string().trim().min(1),
    /** When: a year, or a range of two — "2019", "2014-15", "2014-2015". */
    year: z
      .string()
      .trim()
      .regex(/^\d{4}(-\d{2}|-\d{4})?$/, 'must be a year or a range, e.g. "2019" or "2014-15"'),
    cover: mediaPath,
    /**
     * A page that stands on its own: no back-link bar above or below it. For an album
     * shared by link alone, which shouldn't hand the reader a way into the rest of the
     * site. Standalone albums stay out of `src/albums/index.js` entirely.
     */
    standalone: z.boolean().default(false),
    theme: themeSchema.optional(),
    items: z
      .array(
        z.discriminatedUnion('type', [
          z
            .object({
              type: z.literal('photos'),
              /** One to six frames; the count fixes the row layout. */
              images: z.array(photo).min(1).max(6),
              /** Shown once, under the whole block — each frame keeps its own `alt`. */
              caption,
              /** Gives the first frame a row of its own; a block of two shares one row, 2/3 + 1/3. */
              hero: z.boolean().default(false),
            })
            .strict(),
          z
            .object({
              type: z.literal('broll'),
              /**
               * A whole number of rows: six, twelve, eighteen. Three across on a wide
               * screen and two on a phone, so a multiple of six fills both without
               * leaving a short last row either way.
               */
              images: z
                .array(photo)
                .min(6)
                .refine((frames) => frames.length % 6 === 0, {
                  message: 'must be a multiple of six — a b-roll grid fills whole rows',
                }),
              /** Shown once, under the whole grid — each frame keeps its own `alt`. */
              caption,
            })
            .strict(),
          z
            .object({
              type: z.literal('video'),
              src: mediaPath,
              poster: mediaPath.optional(),
              /** Screen readers only, like a frame's `alt` — never printed on the page. */
              alt: z.string().optional(),
              /** The line printed under the film, same as a `photos` block's. */
              caption,
              loop: z.boolean().default(false),
              muted: z.boolean().default(false),
              autoplay: z.boolean().default(false),
            })
            .strict(),
          z
            .object({
              type: z.literal('subheading'),
              /** The chapter line: a place, a day, whatever divides the album. */
              title: z.string().trim().min(1),
              /** Optional line under it, set as body text. Blank lines become paragraphs. */
              text: z.string().trim().min(1).optional(),
            })
            .strict(),
          z
            .object({
              type: z.literal('quote'),
              /** The quoted line itself, set large and centred between quotation marks. */
              text: z.string().trim().min(1),
              /** Who said it. Printed under the quote, centred. */
              attribution: z.string().trim().min(1).optional(),
              /** Turns the attribution into a link. Needs an `attribution` to hang on. */
              url: z.url().optional(),
            })
            .strict(),
        ]),
      )
      .min(1),
  })
  .strict()
  /*
   * Checked here rather than on the block because a discriminated union only takes
   * plain objects — a refinement on one of its members isn't one. The path still
   * names the exact field, which is all the message needs to be useful.
   */
  .superRefine((manifest, ctx) => {
    manifest.items.forEach((item, i) => {
      if (item.type === 'quote' && item.url && !item.attribution) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', i, 'url'],
          message: 'needs an `attribution` alongside it — the link has no text without one',
        });
      }
    });
  });

export const homeManifestSchema = z
  .object({
    /** Browser tab and share title for the home page. */
    title: z.string().trim().min(1),
    /** Short name: the masthead, and the back link on every album page. */
    heading: z.string().trim().min(1),
    description: z.string().trim().min(1),
    /** Share image, relative to src/albums/index.js. */
    cover: mediaPath,
    posts: z.array(z.string()),
  })
  .strict();

/**
 * The shape you write in an album manifest. The JSDoc type annotation at the top of
 * each manifest.js points here, which is what gives you autocomplete on block
 * types and a red squiggle on a bad field without any build step.
 */
export type AlbumManifest = z.input<typeof albumManifestSchema>;

/** The shape of src/albums/index.js. */
export type HomeManifest = z.input<typeof homeManifestSchema>;

/** Home page settings after the cover path has been resolved to a real asset. */
export interface Site {
  title: string;
  heading: string;
  description: string;
  cover: ImageMetadata;
}

/** One frame of a `photos` block after its path has been resolved. */
export interface Photo {
  src: ImageMetadata;
  alt?: string;
}

/** A block after its media paths have been resolved to real assets. */
export type Item =
  | {
      type: 'photos';
      images: Photo[];
      caption?: string;
      hero: boolean;
    }
  | {
      type: 'broll';
      images: Photo[];
      caption?: string;
    }
  | {
      type: 'video';
      src: string;
      poster?: ImageMetadata;
      alt?: string;
      caption?: string;
      loop: boolean;
      muted: boolean;
      autoplay: boolean;
    }
  | { type: 'subheading'; title: string; text?: string }
  | { type: 'quote'; text: string; attribution?: string; url?: string };

export interface Album {
  /** Folder name, which is also the URL. */
  slug: string;
  title: string;
  location: string;
  year: string;
  cover: ImageMetadata;
  /** True hides the back-link bars, leaving the album with no route to the home page. */
  standalone: boolean;
  theme?: Theme;
  items: Item[];
}

/** Turns a validation failure into something that names the file and the field. */
export function formatIssues(error: z.ZodError, file: string): string {
  const lines = error.issues.map(
    (issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`,
  );
  return `${file} doesn't match the manifest format:\n${lines.join('\n')}`;
}
