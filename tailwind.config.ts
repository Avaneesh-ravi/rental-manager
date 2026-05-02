import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-playfair)', 'serif'],
      },
      colors: {
        brand: {
          50: '#fdf6ee',
          100: '#f9e8d0',
          200: '#f2cd9d',
          300: '#eaac62',
          400: '#e38c35',
          500: '#dc711a',
          600: '#c45612',
          700: '#a33e12',
          800: '#843116',
          900: '#6c2a15',
          950: '#3d1208',
        },
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'warm': '0 4px 24px -2px rgba(220, 113, 26, 0.15)',
        'warm-lg': '0 10px 40px -4px rgba(220, 113, 26, 0.2)',
      },
    },
  },
  plugins: [],
}
export default config
