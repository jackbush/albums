import home from '../albums/index.js';
import { resolveImage, resolveSiteImage, resolveVideo } from './media';
import {
  albumManifestSchema,
  homeManifestSchema,
  formatIssues,
  type Item,
  type Album,
  type Site,
} from './schema';

export type { Album, Item, Site };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Every manifest module in the content tree, keyed by file path. */
const MANIFESTS = import.meta.glob<{ default: unknown }>('/src/albums/*/manifest.js', {
  eager: true,
});

/**
 * Validates one manifest and resolves its media paths to real assets.
 *
 * Validation happens here rather than at import time so the error can name the
 * manifest file and the exact field — "items.1.src: Required" rather than a
 * stack trace from somewhere in the render.
 */
function loadAlbum(slug: string, module: { default: unknown }): Album {
  const parsed = albumManifestSchema.safeParse(module.default);
  if (!parsed.success) {
    throw new Error(formatIssues(parsed.error, `src/albums/${slug}/manifest.js`));
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
 * Loads every album, keyed by slug, failing the build on an illegal folder name.
 *
 * The folder name *is* the URL, so a stray space or capital would either 404 or
 * silently produce an ugly link. Better to stop the build and say which folder.
 */
export function getAlbums(): Map<string, Album> {
  const albums = new Map<string, Album>();

  for (const [path, module] of Object.entries(MANIFESTS)) {
    const slug = path.split('/')[3];

    if (!SLUG_PATTERN.test(slug)) {
      throw new Error(
        `Illegal album folder name: "src/albums/${slug}/".\n` +
          `Folder names become URLs, so they must be lowercase letters, numbers and ` +
          `single hyphens — e.g. "2019-purbeck". Rename the folder and update ` +
          `src/albums/index.js to match.`,
      );
    }

    albums.set(slug, loadAlbum(slug, module));
  }

  return albums;
}

/** Validates `src/albums/index.js` once, naming the file and field on failure. */
function loadHome() {
  const parsed = homeManifestSchema.safeParse(home);
  if (!parsed.success) {
    throw new Error(formatIssues(parsed.error, 'src/albums/index.js'));
  }
  return parsed.data;
}

/**
 * Home page settings — title, heading, description and share image.
 *
 * The one place the site's own metadata comes from, so the layout never has to
 * know where it was written.
 */
export function getSite(): Site {
  const data = loadHome();
  return {
    title: data.title,
    heading: data.heading,
    description: data.description,
    cover: resolveSiteImage(data.cover),
  };
}

/**
 * Resolves `src/albums/index.js` into the ordered list shown on the home page.
 *
 * A listed slug with no folder is an error — it's a typo, and quietly dropping it
 * would hide a post without telling you. A folder that isn't listed is only a
 * warning: its page still builds, it's just unlinked, which is how drafts work.
 */
export function getListedAlbums(): Album[] {
  const albums = getAlbums();

  const listed = loadHome().posts;

  const missing = listed.filter((slug) => !albums.has(slug));
  if (missing.length > 0) {
    throw new Error(
      `src/albums/index.js lists ${missing.length === 1 ? 'a slug' : 'slugs'} with no ` +
        `matching folder: ${missing.map((s) => `"${s}"`).join(', ')}.\n` +
        `Expected src/albums/<slug>/manifest.js for each. ` +
        `Known albums: ${[...albums.keys()].join(', ') || '(none)'}.`,
    );
  }

  const duplicates = listed.filter((slug, i) => listed.indexOf(slug) !== i);
  if (duplicates.length > 0) {
    throw new Error(
      `src/albums/index.js lists ${[...new Set(duplicates)].map((s) => `"${s}"`).join(', ')} ` +
        `more than once. Each album should appear exactly once.`,
    );
  }

  for (const slug of albums.keys()) {
    if (!listed.includes(slug)) {
      console.warn(
        `[albums] "${slug}" isn't in src/albums/index.js, so it won't appear on the ` +
          `home page. Its page still builds at /${slug}/. Add it to the list when it's ready.`,
      );
    }
  }

  return listed.map((slug) => albums.get(slug)!);
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
