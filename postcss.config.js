export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
    'postcss-preset-env': {
      features: {
        'oklch-query': true,
        'color-functional-notation': true,
        'custom-selectors': false,
      },
    },
  },
}
