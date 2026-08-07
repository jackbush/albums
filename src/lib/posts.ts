import home from '../trips/index.js';
import { resolveImage, resolveVideo } from './media';
import {
  tripManifestSchema,
  homeManifestSchema,
  formatIssues,
  type Item,
  type Trip,
} from './schema';

export type { Trip, Item };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Every manifest module in the content tree, keyed by file path. */
const MANIFESTS = import.meta.glob<{ default: unknown }>('/src/trips/*/manifest.js', {
  eager: true,
});

/**
 * Validates one manifest and resolves its media paths to real assets.
 *
 * Validation happens here rather than at import time so the error can name the
 * manifest file and the exact field — "items.1.src: Required" rather than a
 * stack trace from somewhere in the render.
 */
function loadTrip(slug: string, module: { default: unknown }): Trip {
  const parsed = tripManifestSchema.safeParse(module.default);
  if (!parsed.success) {
    throw new Error(formatIssues(parsed.error, `src/trips/${slug}/manifest.js`));
  }

  const data = parsed.data;
  const items: Item[] = data.items.map((item) => {
    switch (item.type) {
      case 'image':
        return { ...item, src: resolveImage(slug, item.src) };
      case 'video':
        return {
          ...item,
          src: resolveVideo(slug, item.src),
          poster: item.poster ? resolveImage(slug, item.poster) : undefined,
        };
      default:
        return item;
    }
  });

  return { ...data, slug, cover: resolveImage(slug, data.cover), items };
}

/**
 * Loads every trip, keyed by slug, failing the build on an illegal folder name.
 *
 * The folder name *is* the URL, so a stray space or capital would either 404 or
 * silently produce an ugly link. Better to stop the build and say which folder.
 */
export function getTrips(): Map<string, Trip> {
  const trips = new Map<string, Trip>();

  for (const [path, module] of Object.entries(MANIFESTS)) {
    const slug = path.split('/')[3];

    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(
        `Illegal trip folder name: "src/trips/${slug}/".\n` +
          `Folder names become URLs, so they must be lowercase letters, numbers and ` +
          `single hyphens — e.g. "2019-purbeck". Rename the folder and update ` +
          `src/trips/index.js to match.`,
      );
    }

    trips.set(slug, loadTrip(slug, module));
  }

  return trips;
}

/**
 * Resolves `src/trips/index.js` into the ordered list shown on the home page.
 *
 * A listed slug with no folder is an error — it's a typo, and quietly dropping it
 * would hide a post without telling you. A folder that isn't listed is only a
 * warning: its page still builds, it's just unlinked, which is how drafts work.
 */
export function getListedTrips(): Trip[] {
  const trips = getTrips();

  const parsed = homeManifestSchema.safeParse(home);
  if (!parsed.success) {
    throw new Error(formatIssues(parsed.error, 'src/trips/index.js'));
  }
  const listed = parsed.data.posts;

  const missing = listed.filter((slug) => !trips.has(slug));
  if (missing.length > 0) {
    throw new Error(
      `src/trips/index.js lists ${missing.length === 1 ? 'a slug' : 'slugs'} with no ` +
        `matching folder: ${missing.map((s) => `"${s}"`).join(', ')}.\n` +
        `Expected src/trips/<slug>/manifest.js for each. ` +
        `Known trips: ${[...trips.keys()].join(', ') || '(none)'}.`,
    );
  }

  const duplicates = listed.filter((slug, i) => listed.indexOf(slug) !== i);
  if (duplicates.length > 0) {
    throw new Error(
      `src/trips/index.js lists ${[...new Set(duplicates)].map((s) => `"${s}"`).join(', ')} ` +
        `more than once. Each trip should appear exactly once.`,
    );
  }

  for (const slug of trips.keys()) {
    if (!listed.includes(slug)) {
      console.warn(
        `[gallery] "${slug}" isn't in src/trips/index.js, so it won't appear on the ` +
          `home page. Its page still builds at /${slug}/. Add it to the list when it's ready.`,
      );
    }
  }

  return listed.map((slug) => trips.get(slug)!);
}

/** Number of image blocks in a post — the "plates" count shown on the index. */
export function plateCount(items: Item[]): number {
  return items.filter((item) => item.type === 'image').length;
}

/**
 * Assigns each image its plate number, counting images only.
 *
 * The same numbering appears under each image and in the lightbox counter, so a
 * plate referenced in one place is findable in the other.
 */
export function withPlateNumbers(items: Item[]): Array<{ item: Item; plate: number | null }> {
  let plate = 0;
  return items.map((item) => ({
    item,
    plate: item.type === 'image' ? ++plate : null,
  }));
}
