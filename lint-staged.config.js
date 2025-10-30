const jsAndTsFiles = '*.{js,jsx,ts,tsx}';
const prettierFiles = '*.{js,jsx,ts,tsx,json,md,css,scss,html,yml,yaml}';

const quoteFiles = (files) => files.map((file) => JSON.stringify(file)).join(' ');

module.exports = {
  [jsAndTsFiles]: (files) => {
    if (files.length === 0) return [];
    const filesList = quoteFiles(files);
    return [`pnpm exec eslint --fix ${filesList}`];
  },
  [prettierFiles]: (files) => {
    if (files.length === 0) return [];
    const filesList = quoteFiles(files);
    return [`pnpm exec prettier --write --ignore-unknown ${filesList}`];
  },
  '**/*.{js,jsx,ts,tsx}': () => 'pnpm exec tsc -p tsconfig.json --noEmit',
};
