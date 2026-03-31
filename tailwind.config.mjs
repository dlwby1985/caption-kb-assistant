/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-primary': '#6366F1',
        'brand-light': '#818CF8',
        'brand-dark': '#4F46E5',
        'brand-accent': '#F59E0B',
        'surface-50': '#FAFAFA',
        'surface-100': '#F5F5F5',
        'surface-200': '#E5E5E5',
        'surface-300': '#D4D4D4',
        'surface-400': '#A3A3A3',
        'surface-500': '#737373',
        'surface-600': '#525252',
        'surface-700': '#404040',
        'surface-800': '#262626',
        'surface-900': '#171717',
      },
    },
  },
  plugins: [],
}
