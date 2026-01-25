/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
    "./utils/**/*.{ts,tsx}",
  ],
  important: '.hermes-root',
  corePlugins: {
    preflight: false,
    // Disable all color-related plugins
    textColor: false,
    backgroundColor: false,
    borderColor: false,
    divideColor: false,
    placeholderColor: false,
    gradientColorStops: false,
  },
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
