/**
 * Deletes emitted image assets that nothing in the built site links to.
 *
 * `media.ts` globs every file in the album tree so manifests can be validated against
 * real files, and Vite emits an asset for each one it imports — including the untouched
 * originals, which are 5–16MB each and which no page references. Resized variants are
 * the only images the site actually serves, so the originals are pure payload.
 *
 * The exception is animated GIFs: `ImageItem` and `GroupItem` serve those from the
 * original, so they do appear in the markup and survive the pass. This works off what
 * the built HTML, CSS and JS reference rather than a filename rule, so anything newly
 * referenced keeps itself.
 */
import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const IMAGE = /\.(jpe?g|png|gif|webp|avif)$/i;
const TEXT = new Set(['.html', '.css', '.js', '.json', '.xml', '.txt']);

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else found.push(path);
  }
  return found;
}

export default function pruneUnreferencedAssets() {
  return {
    name: 'prune-unreferenced-assets',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = await walk(root);

        const text = await Promise.all(
          files
            .filter((file) => TEXT.has(extname(file).toLowerCase()))
            .map((file) => readFile(file, 'utf8')),
        );
        const haystack = text.join('\n');

        let removed = 0;
        let freed = 0;
        for (const file of files.filter((f) => IMAGE.test(f))) {
          const name = file.slice(root.length).split('/').pop();
          if (haystack.includes(name)) continue;
          freed += (await stat(file)).size;
          await unlink(file);
          removed += 1;
        }

        const mb = (freed / 1024 / 1024).toFixed(0);
        logger.info(`Pruned ${removed} unreferenced image${removed === 1 ? '' : 's'} (${mb}MB)`);
      },
    },
  };
}
