import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ═══════════════════════════════════════════════════════
      // COLOUR SYSTEM — Change these to update the entire site
      // ═══════════════════════════════════════════════════════
      colors: {
        primary: {
          DEFAULT: '#1B2A4A',    // Midnight Navy — main dark colour
          light: '#4A6FA5',      // Lighter navy for hover states
          dark: '#0F1A30',       // Darker navy for contrast
          pale: '#EEF2F8',       // Pale navy for backgrounds
        },
        accent: {
          DEFAULT: '#C9A84C',    // Champagne — accent colour
          light: '#E8C87A',      // Lighter champagne for hover
          dark: '#A88B2A',       // Darker champagne for pressed
          muted: '#C9A84C20',   // Champagne with opacity for backgrounds
        },
        surface: {
          DEFAULT: '#FFFFFF',
          cream: '#F8F6F0',
          dark: '#EEF2F8',
          muted: '#D0D8E8',
        },
        text: {
          DEFAULT: '#445060',
          light: '#6A7A8A',
          inverse: '#FFFFFF',
          accent: '#C9A84C',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
