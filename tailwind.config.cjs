/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: 'tw-',
  important: '.admin-shell',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: '#fff' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--foreground))' },
        // Account panels (company/driver/broker): orange accent on navy ink over a pale blue page.
        brand: {
          orange: '#F5761A',
          'orange-dark': '#DC6310',
          'orange-soft': '#FDEEE3',
          'orange-ink': '#C2410C',
          navy: '#0E1A3B',
          muted: '#6B7488',
          sky: '#E8EEFA',
          line: '#E3E9F4',
          bg: '#F4F7FC',
        },
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [],
};
