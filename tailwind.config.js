/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./views/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'background': '#f9fafb', // gray-50
                'dark-background': '#000000',
                'card-bg': '#ffffff',
                'dark-card-bg': '#121212',
                'primary-text': '#111827', // gray-900
                'dark-primary-text': '#f9fafb', // gray-50
                'secondary-text': '#6b7280', // gray-500
                'dark-secondary-text': '#9ca3af', // gray-400
                'accent-primary': '#8b5cf6', // violet-500 (Genfess purple vibe)
                'border-color': '#e5e7eb', // gray-200
                'dark-border-color': '#27272a', // zinc-800
            },
            fontFamily: {
                logo: ['Outfit', 'sans-serif'], // Assuming Outfit was used
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'pulse-subtle': 'pulse-subtle 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up-fade': 'slideUpFade 0.5s ease-out forwards',
                'heart-pop': 'heartPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            },
            keyframes: {
                'pulse-subtle': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.8 },
                },
                fadeIn: {
                    '0%': { opacity: 0, transform: 'translateY(10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                slideUpFade: {
                    '0%': { opacity: 0, transform: 'translateY(10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                heartPop: {
                    '0%': { transform: 'scale(0)' },
                    '50%': { transform: 'scale(1.2)' },
                    '100%': { transform: 'scale(1)' },
                }
            }
        },
    },
    plugins: [],
}
