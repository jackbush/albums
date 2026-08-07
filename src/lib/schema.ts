import { z } from 'astro/zod';

/** Colours accept any CSS colour; we only reject empty strings. */
const cssColour = z.string().trim().min(1);

const mediaPath = z.string().trim().min(1);

export const themeSchema = z
  .object({
    background: cssColour.optional(),
    accent: cssColour.optional(),
    textPrimary: cssColour.optional(),
    textSecondary: cssColour.optional(),
    /** Falls back to textPrimary. */
    textTitle: cssColour.optional(),
    /** Falls back to accent. */
    textLink: cssColour.optional(),
    /** Google Fonts family name, e.g. "Fraunces". */
    fontBody: z.string().trim().min(1).optional(),
    fontHeading: z.string().trim().min(1).optional(),
  })
  .strict();

export type Theme = z.infer<typeof themeSchema>;

export const tripManifestSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    /** Free-form display string: "April 2019", "Summer 2024". Never parsed. */
    date: z.string().trim().min(1),
    cover: mediaPath,
    theme: themeSchema.optional(),
    items: z
      .array(
        z.discriminatedUnion('type', [
          z
            .object({
              type: z.literal('image'),
              src: mediaPath,
              alt: z.string().optional(),
            })
            .strict(),
          z
            .object({
              type: z.literal('video'),
              src: mediaPath,
              poster: mediaPath.optional(),
              alt: z.string().optional(),
              loop: z.boolean().default(false),
              muted: z.boolean().default(false),
              autoplay: z.boolean().default(false),
            })
            .strict(),
          z
            .object({
              type: z.literal('quote'),
              text: z.string().trim().min(1),
              attribution: z.string().trim().min(1).optional(),
              attributionLink: z.string().url().optional(),
            })
            .strict(),
          z
            .object({
              type: z.literal('text'),
              /** Blank lines become paragraphs. Plain text, not markdown. */
              text: z.string().trim().min(1),
            })
            .strict(),
        ]),
      )
      .min(1),
  })
  .strict();

export const homeManifestSchema = z.object({ posts: z.array(z.string()) }).strict();

/**
 * The shape you write in a trip manifest. The JSDoc type annotation at the top of
 * each manifest.js points here, which is what gives you autocomplete on block
 * types and a red squiggle on a bad field without any build step.
 */
export type TripManifest = z.input<typeof tripManifestSchema>;

/** The shape of src/trips/index.js. */
export type HomeManifest = z.input<typeof homeManifestSchema>;

/** A block after its media paths have been resolved to real assets. */
export type Item =
  | { type: 'image'; src: ImageMetadata; alt?: string }
  | {
      type: 'video';
      src: string;
      poster?: ImageMetadata;
      alt?: string;
      loop: boolean;
      muted: boolean;
      autoplay: boolean;
    }
  | { type: 'quote'; text: string; attribution?: string; attributionLink?: string }
  | { type: 'text'; text: string };

export interface Trip {
  /** Folder name, which is also the URL. */
  slug: string;
  title: string;
  description: string;
  date: string;
  cover: ImageMetadata;
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
