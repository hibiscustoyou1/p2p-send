import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'common/index': 'src/common/index.ts',
    'node/index': 'src/node/index.ts',
    'browser/index': 'src/browser/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['dotenv', 'fs', 'path', 'crypto', 'events'],
});
