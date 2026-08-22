/**
 * Deletes cache entries the current build didn't use. CI only.
 *
 * The image cache is keyed on content, so changing a width, a format or a quality
 * setting doesn't replace the old entries — it adds new ones beside them. Locally that
 * is what makes reverting an experiment free, so the prune stays off. CI never goes
 * backwards, and it pays for the cache twice on every run (download and upload), so
 * there the dead weight is pure cost.
 *
 * Runs after `prune-unreferenced-assets`, and compares against what survives that pass.
 * Originals are copied rather than processed, so they are never in the cache to begin
 * with and this only ever sees resized variants. Deleting a live entry would cost a
 * re-encode on the next build and nothing else, so the failure mode is time, not
 * a broken site.
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cacheDir;

export default function pruneImageCache() {
  return {
    name: 'prune-image-cache',
    hooks: {
      'astro:config:done': ({ config }) => {
        cacheDir = config.cacheDir;
      },

      'astro:build:done': async ({ dir, logger }) => {
        if (!process.env.CI) return;

        const assets = join(fileURLToPath(cacheDir), 'assets');
        const built = new Set(await readdir(join(fileURLToPath(dir), '_astro')));

        let removed = 0;
        let freed = 0;
        for (const entry of await readdir(assets)) {
          if (built.has(entry)) continue;
          const path = join(assets, entry);
          freed += (await stat(path)).size;
          await unlink(path);
          removed += 1;
        }

        const mb = (freed / 1024 / 1024).toFixed(0);
        logger.info(`Pruned ${removed} stale cache entr${removed === 1 ? 'y' : 'ies'} (${mb}MB)`);
      },
    },
  };
}
