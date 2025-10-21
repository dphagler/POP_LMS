"use strict";

const postcss = require("postcss");
const tailwindcss = require("tailwindcss");

function resolveConfigPath(pluginOptions, result) {
  if (pluginOptions && pluginOptions.config) {
    return pluginOptions.config;
  }
  if (process.env.TAILWIND_CONFIG) {
    return process.env.TAILWIND_CONFIG;
  }
  if (result && result.opts && result.opts.tailwindConfig) {
    return result.opts.tailwindConfig;
  }
  return undefined;
}

function toCandidateList(designSystem) {
  if (!designSystem || typeof designSystem.getClassList !== "function") {
    return [];
  }
  return Array.from(designSystem.getClassList(), (entry) =>
    Array.isArray(entry) ? entry[0] : entry
  );
}

module.exports = function tailwindcssPostcss(pluginOptions = {}) {
  return {
    postcssPlugin: "tailwindcss",
    async Once(root, helpers) {
      const { result } = helpers;
      const from = result.opts.from;
      const config = resolveConfigPath(pluginOptions, result);
      const sourceCss = root.toString();

      const compileOptions = { from };
      if (config) {
        compileOptions.config = config;
      }

      const compiled = await tailwindcss.compile(sourceCss, compileOptions);
      const designSystem = await tailwindcss.__unstable__loadDesignSystem(
        sourceCss,
        compileOptions
      );
      const candidates = toCandidateList(designSystem);
      const outputCss = compiled.build(candidates);
      const nextRoot = postcss.parse(outputCss, { from });

      root.removeAll();
      nextRoot.each((node) => {
        root.append(node);
      });
    }
  };
};

module.exports.postcss = true;
