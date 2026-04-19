const colors = require('tailwindcss/colors');

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                // Removed custom mappings to restore the standard professional blue & slate theme.
            },
            animation: {
                'float':        'float 6s ease-in-out infinite',
                'fade-in-up':   'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'scale-up':     'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'pulse-soft':   'pulseSoft 3s ease-in-out infinite',
                'shimmer':      'skeleton-shimmer 1.4s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%':      { transform: 'translateY(-10px)' },
                },
                fadeInUp: {
                    '0%':   { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleUp: {
                    '0%':   { opacity: '0', transform: 'scale(0.94) translateY(4px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%':      { opacity: '0.8' },
                },
            }
        },
    },
    plugins: [],
}
