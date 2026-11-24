import type { Config } from 'tailwindcss';

// Dechub Cloud design tokens: "Orchid & Brass".
// A mauve shell, an orchid action colour, and brass reserved for what matters
// most (the active place you are in, and won business).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1A1626', soft: '#3A3450', muted: '#6E6880', faint: '#9A95AA' },
        aubergine: { DEFAULT: '#241B35', deep: '#1B1428', raised: '#2F2545', line: '#3B3054' },
        mauve: { DEFAULT: '#E0B0FF', raised: '#ECD0FF', line: '#B982D6' },
        orchid: { DEFAULT: '#5B3CC4', hover: '#4C30AE', soft: '#EEEAFB', ring: '#B8A8F0' },
        brass: { DEFAULT: '#B98A3E', soft: '#F6EEDC', light: '#E3C68E' },
        canvas: '#F5F4F8',
        surface: '#FFFFFF',
        line: { DEFAULT: '#E4E1EC', strong: '#CFCADC' },
        sage: { DEFAULT: '#2E7D5B', soft: '#E3F2EA' },
        amber: { DEFAULT: '#B7791F', soft: '#FBF0DC' },
        rose: { DEFAULT: '#B3364F', soft: '#F9E4E8' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Onest Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        panel: '0 1px 0 rgba(26,22,38,0.04), 0 8px 24px -12px rgba(36,27,53,0.18)',
        lift: '0 12px 32px -12px rgba(36,27,53,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
