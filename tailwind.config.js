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
                // Light mode
                'background': '#fafafa',
                'card-bg': '#ffffff',
                'primary-text': '#0f0f0f',
                'secondary-text': '#737373',
                'border-color': '#e5e5e5',

                // Dark mode (Instagram-like pure black)
                'dark-background': '#000000',
                'dark-card-bg': '#000000',
                'dark-primary-text': '#fafafa',
                'dark-secondary-text': '#a3a3a3',
                'dark-border-color': '#262626',

                // Accent colors (vibrant purple/violet)
                'accent-primary': '#8b5cf6',
                'accent-secondary': '#a78bfa',
                'accent-pink': '#ec4899',
                'accent-blue': '#3b82f6',

                // Semantic colors
                'success': '#22c55e',
                'warning': '#f59e0b',
                'error': '#ef4444',
            },
            fontFamily: {
                logo: ['Outfit', 'sans-serif'],
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            fontSize: {
                'xxs': '0.65rem',
            },
            borderRadius: {
                '4xl': '2rem',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(139, 92, 246, 0.3)',
                'glow-lg': '0 0 40px rgba(139, 92, 246, 0.4)',
                'inner-light': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'mesh-gradient': 'radial-gradient(at 40% 20%, hsla(280,100%,76%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.2) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.3) 0px, transparent 50%)',
            },
            animation: {
                'pulse-subtle': 'pulse-subtle 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
                'slide-up-fade': 'slideUpFade 0.5s ease-out forwards',
                'slide-in-up': 'slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in-down': 'slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
                'slide-in-right': 'slideInRight 0.3s ease-out forwards',
                'slide-in-bottom-fade': 'slideInBottomFade 0.3s ease-out forwards',
                'heart-pop': 'heartPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                'bounce-small': 'bounceSmall 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out forwards',
                'spin-slow': 'spin 3s linear infinite',
                'aurora': 'aurora 10s ease-in-out infinite',
            },
            keyframes: {
                'pulse-subtle': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.8 },
                },
                fadeIn: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
                fadeInUp: {
                    '0%': { opacity: 0, transform: 'translateY(20px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                slideUpFade: {
                    '0%': { opacity: 0, transform: 'translateY(10px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                slideInUp: {
                    '0%': { transform: 'translateY(100%)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                },
                slideInDown: {
                    '0%': { transform: 'translateY(-100%)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                },
                slideInLeft: {
                    '0%': { transform: 'translateX(-100%)', opacity: 0 },
                    '100%': { transform: 'translateX(0)', opacity: 1 },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: 0 },
                    '100%': { transform: 'translateX(0)', opacity: 1 },
                },
                slideInBottomFade: {
                    '0%': { opacity: 0, transform: 'translateY(20px)' },
                    '100%': { opacity: 1, transform: 'translateY(0)' },
                },
                heartPop: {
                    '0%': { transform: 'scale(0)' },
                    '50%': { transform: 'scale(1.3)' },
                    '100%': { transform: 'scale(1)' },
                },
                bounceSmall: {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.25)' },
                    '100%': { transform: 'scale(1)' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.9)', opacity: 0 },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                },
                aurora: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
            },
            transitionTimingFunction: {
                'bounce-in': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
        },
    },
    plugins: [],
}
