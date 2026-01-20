/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
            },
            colors: {
                surface: {
                    DEFAULT: '#0d0e12',
                    elevated: '#14161c',
                    overlay: '#1a1d25',
                },
                accent: {
                    DEFAULT: '#3b82f6',
                    hover: '#60a5fa',
                },
                danger: {
                    DEFAULT: '#ef4444',
                    hover: '#f87171',
                    subtle: 'rgba(239, 68, 68, 0.1)',
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
