'use strict';

const tailwindcss = require('tailwindcss');

module.exports = function tailwindcssPostcss(...args) {
  return tailwindcss(...args);
};

module.exports.postcss = true;
