import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'names/index': 'src/names/index.ts',
    'phones/index': 'src/phones/index.ts',
    'emails/index': 'src/emails/index.ts',
    'companies/index': 'src/companies/index.ts',
    'addresses/index': 'src/addresses/index.ts',
    'common/index': 'src/common/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
});
