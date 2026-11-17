import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          50: '#F0F9F4',
          100: '#DCF1E4',
          200: '#BAE3CB',
          300: '#8CCFA9',
          400: '#52B380',
          500: '#2E9A63',
          600: '#1F7A4D',
          700: '#1A6240',
          800: '#164E34',
          900: '#0F3624',
          950: '#0A2418',
        },
        gold: {
          50: '#FBF7EC',
          100: '#F5EBD0',
          300: '#E3C677',
          500: '#C9A24B',
          600: '#A8832F',
          700: '#7F6222',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F4F3EE',
        },
        bg: '#FAFAF7',
        line: {
          DEFAULT: '#E7E5DF',
          strong: '#D2CFC6',
        },
        ink: '#0A2418',
        fg: {
          DEFAULT: '#1C1F1D',
          muted: '#5F665F',
          subtle: '#8A8F88',
        },
        success: {
          DEFAULT: '#15803D',
          soft: '#DCFCE7',
          ink: '#14532D',
        },
        warning: {
          DEFAULT: '#B45309',
          soft: '#FEF3C7',
          ink: '#78350F',
        },
        danger: {
          DEFAULT: '#B42318',
          soft: '#FEE4E2',
          ink: '#7A271A',
        },
        info: {
          DEFAULT: '#1D4ED8',
          soft: '#DBEAFE',
          ink: '#1E3A8A',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(2.25rem, 1.5rem + 3.5vw, 4rem)', { lineHeight: '1.05' }],
        'display-lg': ['clamp(1.75rem, 1.2rem + 2.2vw, 2.75rem)', { lineHeight: '1.1' }],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(10,36,24,.06)',
        sm: '0 2px 8px rgba(10,36,24,.08)',
        md: '0 8px 24px rgba(10,36,24,.10)',
        lg: '0 16px 48px rgba(10,36,24,.16)',
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
} satisfies Config
