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
      // Vite 8 minifies CSS with Lightning CSS, which rewrites to whatever the target
      // allows — untargeted it emits media range syntax (`(width<=48rem)`), which
      // Safari only understands from 16.4. Naming a floor keeps the media queries in
      // the `max-width` form every browser that can render the rest of the site reads.
      cssTarget: ['chrome100', 'safari15', 'firefox100'],
      // Never inline video as a data: URI — it defeats range requests, so the
      // browser can't seek and has to download the whole clip before playing.
      assetsInlineLimit: (file) => (/\.(mp4|webm|mov)$/i.test(file) ? false : undefined),
    },
  },
});
