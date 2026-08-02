import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Two build targets:
 *
 *   vite build              -> dist/     one self-contained index.html, for
 *                                        offline use by double-clicking.
 *   vite build --mode web   -> dist-web/ normal hashed assets, so a CDN can
 *                                        cache chunks and repeat visits only
 *                                        fetch a small index.html.
 *
 * `base: "./"` keeps both working from any path — file://, a domain root, or
 * a GitHub Pages project subpath like /open-source-math-calculator/.
 */
export default defineConfig(({ mode }) => {
  const web = mode === "web";

  return {
    base: "./",
    plugins: web ? [] : [viteSingleFile()],
    server: { port: 5181, open: true },
    build: {
      outDir: web ? "dist-web" : "dist",
      emptyOutDir: true,
      assetsInlineLimit: web ? 4096 : 100_000_000,
      chunkSizeWarningLimit: 8000,
      cssCodeSplit: false,
      reportCompressedSize: false,
    },
  };
});
