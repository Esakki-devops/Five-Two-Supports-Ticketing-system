import { defineConfig } from 'tsup';

/**
 * Production build: bundle the two process entrypoints (API + worker) to ESM.
 * node_modules are kept external (resolved at runtime), so only our source is bundled.
 */
export default defineConfig({
  entry: ['src/server.ts', 'src/worker.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  splitting: false,
  dts: false,
  bundle: true,
  skipNodeModulesBundle: true,
});
