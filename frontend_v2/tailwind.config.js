/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4A88D8',
          'primary-light': '#7BA8E8',
          'primary-dark': '#3568B0',
          auxiliary: '#63B995',
          'auxiliary-light': '#8FD4B8',
          warm: '#F2A25C',
          'warm-light': '#F7BE8C',
          coral: '#E87575',
          'coral-light': '#F2A0A0',
          bg: '#F7F8FA',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(74, 136, 216, 0.08)',
        'lift': '0 12px 40px rgba(74, 136, 216, 0.15)',
        'glow': '0 0 60px rgba(74, 136, 216, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'bounce-soft': 'bounceSoft 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { boxShadow: '0 8px 32px rgba(74, 136, 216, 0.32)' },
          '50%': { boxShadow: '0 12px 40px rgba(74, 136, 216, 0.5)' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSoft: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
