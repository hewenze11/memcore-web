/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf6ee',
          100: '#fae8d1',
          200: '#f5cfa0',
          300: '#efb06a',
          400: '#e88d38',
          500: '#d4721d',
          600: '#b85c15',
          700: '#924514',
          800: '#763817',
          900: '#612f16',
        }
      }
    },
  },
  plugins: [],
}
