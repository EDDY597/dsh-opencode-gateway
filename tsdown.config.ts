import { defineConfig } from 'tsdown'

// Host-only plugin: one ESM entry. No client bundle — this plugin ships no
// settings UI; configuration lives in the composition layer (cordis.patch.yml).
export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: 'esm',
    fixedExtension: false,
    dts: false,
    clean: true,
  },
])
