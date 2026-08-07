import { getCollection, type CollectionEntry } from 'astro:content';
import homeManifest from '../content/index.json';

export type Trip = CollectionEntry<'trips'>;
export type TripItem = Trip['data']['items'][number];

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Loads every trip, keyed by slug, failing the build on an illegal folder name.
 *
 * The folder name *is* the URL, so a stray space or capital would either 404 or
 * silently produce an ugly link. Better to stop the build and say which folder.
 */
export async function getTrips(): Promise<Map<string, Trip>> {
  const entries = await getCollection('trips');
  const trips = new Map<string, Trip>();

  for (const entry of entries) {
    if (!SLUG_PATTERN.test(entry.id)) {
      throw new Error(
        `Illegal trip folder name: "src/content/trips/${entry.id}/".\n` +
          `Folder names become URLs, so they must be lowercase letters, numbers and ` +
          `single hyphens — e.g. "2019-purbeck". Rename the folder and update ` +
          `src/content/index.json to match.`,
      );
    }
    trips.set(entry.id, entry);
  }

  return trips;
}

/**
 * Resolves `src/content/index.json` into the ordered list shown on the home page.
 *
 * A listed slug with no folder is an error — it's a typo, and quietly dropping it
 * would hide a post without telling you. A folder that isn't listed is only a
 * warning: its page still builds, it's just unlinked, which is how drafts work.
 */
export async function getListedTrips(): Promise<Trip[]> {
  const trips = await getTrips();
  const listed = homeManifest.posts;

  const missing = listed.filter((slug) => !trips.has(slug));
  if (missing.length > 0) {
    throw new Error(
      `src/content/index.json lists ${missing.length === 1 ? 'a slug' : 'slugs'} with no ` +
        `matching folder: ${missing.map((s) => `"${s}"`).join(', ')}.\n` +
        `Expected src/content/trips/<slug>/manifest.json for each. ` +
        `Known trips: ${[...trips.keys()].join(', ') || '(none)'}.`,
    );
  }

  const duplicates = listed.filter((slug, i) => listed.indexOf(slug) !== i);
  if (duplicates.length > 0) {
    throw new Error(
      `src/content/index.json lists ${[...new Set(duplicates)].map((s) => `"${s}"`).join(', ')} ` +
        `more than once. Each trip should appear exactly once.`,
    );
  }

  for (const slug of trips.keys()) {
    if (!listed.includes(slug)) {
      console.warn(
        `[gallery] "${slug}" isn't in src/content/index.json, so it won't appear on the ` +
          `home page. Its page still builds at /${slug}/. Add it to the list when it's ready.`,
      );
    }
  }

  return listed.map((slug) => trips.get(slug)!);
}

/** Number of image blocks in a post — the "plates" count shown on the index. */
export function plateCount(items: TripItem[]): number {
  return items.filter((item) => item.type === 'image').length;
}

/**
 * Assigns each image its plate number, counting images only.
 *
 * The same numbering appears under each image and in the lightbox counter, so a
 * plate referenced in one place is findable in the other.
 */
export function withPlateNumbers(items: TripItem[]): Array<{ item: TripItem; plate: number | null }> {
  let plate = 0;
  return items.map((item) => ({
    item,
    plate: item.type === 'image' ? ++plate : null,
  }));
}
