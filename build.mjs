// Bundles the window code and the preload with esbuild.
// The window is sandboxed, so npm packages must be bundled into one file.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/app.js'],
  bundle: true,
  outfile: 'dist/app.bundle.js',
  platform: 'browser',
  format: 'iife',
  logLevel: 'warning',
});

await build({
  entryPoints: ['preload.cjs'],
  bundle: true,
  outfile: 'dist/preload.cjs',
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  logLevel: 'warning',
});

console.log('Built dist/app.bundle.js and dist/preload.cjs');
