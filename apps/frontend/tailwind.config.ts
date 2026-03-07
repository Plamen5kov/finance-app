import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './providers/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2D6A4F',
          light: '#52B788',
          dark: '#1B4332',
        },
      },
    },
  },
  plugins: [],
};

export default config;
