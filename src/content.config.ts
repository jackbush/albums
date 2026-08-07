import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Colours are validated loosely — any CSS colour is allowed, we just reject empty strings. */
const cssColour = z.string().trim().min(1);

const themeSchema = z
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

export type ThemeInput = z.infer<typeof themeSchema>;

export const collections = {
  trips: defineCollection({
    loader: glob({
      pattern: '*/manifest.json',
      base: './src/content/trips',
      // The folder name is the slug. `entry` is e.g. "2019-purbeck/manifest.json".
      generateId: ({ entry }) => entry.split('/')[0],
    }),
    schema: ({ image }) =>
      z
        .object({
          title: z.string().trim().min(1),
          description: z.string().trim().min(1),
          /** Free-form display string: "April 2019", "Summer 2024", "2023-2024". Never parsed. */
          date: z.string().trim().min(1),
          cover: image(),
          theme: themeSchema.optional(),
          items: z
            .array(
              z.discriminatedUnion('type', [
                z
                  .object({
                    type: z.literal('image'),
                    src: image(),
                    alt: z.string().optional(),
                  })
                  .strict(),
                z
                  .object({
                    type: z.literal('video'),
                    /** Path relative to the manifest, e.g. "./media/clip.mp4". */
                    src: z.string().trim().min(1),
                    poster: image().optional(),
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
        .strict(),
  }),
};
