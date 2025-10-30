const path = require('node:path');

const quoteFiles = (files) =>
  files
    .map((file) => path.relative(process.cwd(), file))
    .map((file) => `"${file}"`)
    .join(' ');

module.exports = {
  '*.{ts,tsx,js,jsx,cjs,mjs}': (files) => {
    const filesList = quoteFiles(files);
    if (!filesList) {
      return ['pnpm exec tsc -p tsconfig.json --noEmit'];
    }

    return [
      `pnpm format ${filesList}`,
      `pnpm exec eslint --fix ${filesList}`,
      'pnpm exec tsc -p tsconfig.json --noEmit',
    ];
  },
  '*.{json,md,mdx,css,scss,pcss,html,yml,yaml}': (files) => {
    const filesList = quoteFiles(files);
    if (!filesList) {
      return [];
    }

    return [`pnpm format ${filesList}`];
  },
};
