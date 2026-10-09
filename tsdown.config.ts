import { defineConfig } from 'tsdown'

/**
 * Modules the web shell hands to client bundles through its module table
 * (`window.__ModuleLoader__`); mirrored from the first-party client builds.
 */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

const isExternal = (source: string): boolean => CLIENT_EXTERNALS.includes(source)

export default defineConfig([
  // Host entry: plugin services, routes, discovery — everything runs in Node.
  {
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: 'esm',
    fixedExtension: false,
    dts: false,
    clean: true,
  },
  // Client entry: the settings-page section, for the web shell to load.
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: isExternal,
      alwaysBundle: source => !isExternal(source),
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-opencode-gateway", factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
