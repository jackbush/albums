// @ts-check
import { defineConfig } from 'astro/config';

import pruneUnreferencedAssets from './integrations/prune-unreferenced-assets.mjs';
import pruneImageCache from './integrations/prune-image-cache.mjs';

// Published at https://jackbush.github.io/albums/
// `base` must match the repo name exactly, or every asset 404s.
export default defineConfig({
  // Order matters: the cache prune compares against what the asset prune leaves behind.
  integrations: [pruneUnreferencedAssets(), pruneImageCache()],

  site: 'https://jackbush.github.io',
  base: '/albums/',
  trailingSlash: 'always',
  // Outside node_modules so `npm ci` — and the CI cache step — can keep it. Holds every
  // generated image variant; regenerating them all takes minutes, restoring takes seconds.
  cacheDir: './.astro-cache',

  build: {
    // Emit `about/index.html` rather than `about.html` so paths work under `base`.
    format: 'directory',
  },
  image: {
    // The default sharp service. Animated GIFs bypass it entirely — see ImageItem.astro.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  vite: {
    build: {
      // Never inline video as a data: URI — it defeats range requests, so the
      // browser can't seek and has to download the whole clip before playing.
      assetsInlineLimit: (file) => (/\.(mp4|webm|mov)$/i.test(file) ? false : undefined),
    },
  },
});
