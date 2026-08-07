// @ts-check
import { defineConfig } from 'astro/config';

// Published at https://jackbush.github.io/albums/
// `base` must match the repo name exactly, or every asset 404s.
export default defineConfig({
  site: 'https://jackbush.github.io',
  base: '/albums/',
  trailingSlash: 'always',
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
