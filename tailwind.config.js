/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './public/**/*.{html,json}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    // ✅ fixed glob
    './src/styles/**/*.css',
  ],

  // ✅ Keep these classes from being purged (we use them across the app)
  safelist: [
    'text-brand',
    'bg-brand-orange',
    'hover:bg-brand-600',
    'border-brand',
    'bg-brand-100',
    'btn-brand',
    'chip',
  ],

  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '72rem', // ~1152px, tweak to match your Bolt max width
      },
    },
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      colors: {
        /* shadcn-style tokens wired to CSS vars */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card-hsl))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent-hsl))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },

        /* === Matt Decanted brand palette === */
        brand: {
          primary: '#1F40C6', // main brand blue
          orange: '#FF9500',  // highlight
          blue: '#3B82F6',    // secondary
          purple: '#8B5CF6',  // premium
          green: '#10B981',   // success
          navy: '#1E293B',    // dark/footer
          soft: '#F3F4F6',    // light bg
          wine: '#7F1D1D',    // wine accent
          ink: '#111827',     // text
          paper: '#FAFAFA',   // page bg
        },
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};
