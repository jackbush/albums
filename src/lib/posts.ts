import home from '../albums/index.js';
import { resolveImage, resolveSiteImage, resolveVideo } from './media';
import {
  albumManifestSchema,
  homeManifestSchema,
  formatIssues,
  type Item,
  type Album,
  type Photo,
  type Site,
} from './schema';

export type { Album, Photo, Item, Site };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Every manifest module in the content tree, keyed by file path. */
const MANIFESTS = import.meta.glob<{ default: unknown }>('/src/albums/*/manifest.js', {
  eager: true,
});

/** `caption: false` is a slot waiting to be filled, so it renders as no caption at all. */
function written(caption: string | false | undefined): string | undefined {
  return caption || undefined;
}

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
      case 'photos':
      case 'broll':
        return {
          ...item,
          images: item.images.map((image) => ({
            ...image,
            src: resolveImage(slug, image.src),
          })),
          caption: written(item.caption),
        };
      case 'video':
        return {
          ...item,
          src: resolveVideo(slug, item.src),
          poster: item.poster ? resolveImage(slug, item.poster) : undefined,
          caption: written(item.caption),
        };
      default:
        return item;
    }
  });

  return { ...data, slug, cover: resolveImage(slug, data.cover), items };
}

/**
 * The one line of metadata an album carries: where, then when.
 *
 * Built here rather than written into the manifests so the separator is a
 * rendering decision — the home page and the album page can't drift apart, and
 * changing the middot doesn't mean editing every manifest.
 */
export function stamp(album: Album): string {
  return `${album.location} \u00b7 ${album.year}`;
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
 * A `standalone` album is meant to be unlisted, so it doesn't warn at all.
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

  for (const [slug, album] of albums) {
    if (!listed.includes(slug) && !album.standalone) {
      console.warn(
        `[albums] "${slug}" isn't in src/albums/index.js, so it won't appear on the ` +
          `home page. Its page still builds at /${slug}/. Add it to the list when it's ready.`,
      );
    }
  }

  return listed.map((slug) => albums.get(slug)!);
}

/**
 * How many plates a block holds: one per photograph, so `photos` and `broll` blocks
 * both hold their frames. B-roll frames open full screen like any other, so they
 * take their place in the same numbered sequence.
 */
function platesIn(item: Item): number {
  return item.type === 'photos' || item.type === 'broll' ? item.images.length : 0;
}

/** Number of photographs in a post — the "plates" count shown on the index. */
export function plateCount(items: Item[]): number {
  return items.reduce((total, item) => total + platesIn(item), 0);
}

/**
 * Numbers each block two ways: by plate and by position in the manifest.
 *
 * The plate number counts photographs only, so a block of several takes a run of
 * consecutive numbers and a quote block takes none. It drives the lightbox counter, which is why
 * the sequence has to stay continuous across block types.
 *
 * The block number counts every entry in `items`, text and all, so it addresses the
 * manifest directly. Only the dev server shows it — see `lib/dev.ts`.
 */
export function withNumbers(
  items: Item[],
): Array<{ item: Item; plate: number | null; block: number }> {
  let plate = 0;
  return items.map((item, i) => {
    const held = platesIn(item);
    const first = held > 0 ? plate + 1 : null;
    plate += held;
    return { item, plate: first, block: i + 1 };
  });
}
