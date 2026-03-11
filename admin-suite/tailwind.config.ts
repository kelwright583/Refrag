import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        charcoal: '#30313A',
        slate: '#30313A',
        accent: '#C72A00',
        copper: '#C72A00',
        muted: '#6B7B86',
        background: '#EAE4DC',
        navy: '#1F2933',
        border: '#D4CFC7',
        surface: '#F5F2EE',
      },
      fontFamily: {
        body: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        subtitle: ['var(--font-anek-bangla)', 'Anek Bangla', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
