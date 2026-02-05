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
                // Light mode (kept for future but dark is primary)
                'background': '#fafafa',
                'card-bg': '#ffffff',
                'primary-text': '#0f0f0f',
                'secondary-text': '#737373',
                'border-color': '#e5e5e5',

                // Dark mode - Premium deep dark theme
                'dark-background': '#050505',
                'dark-card-bg': '#0a0a0a',
                'dark-surface': '#111111',
                'dark-primary-text': '#fafafa',
                'dark-secondary-text': '#8a8a8a',
                'dark-border-color': '#1a1a1a',
                'dark-border': '#1f1f1f',

                // Premium accent colors - Vibrant cyan/teal + magenta
                'accent-primary': '#00d4ff',      // Vibrant cyan
                'accent-secondary': '#7c3aed',    // Deep purple
                'accent-tertiary': '#f43f5e',     // Rose/magenta
                'accent-glow': '#00d4ff',

                // Gradient stops
                'gradient-start': '#00d4ff',
                'gradient-mid': '#7c3aed',
                'gradient-end': '#f43f5e',

                // UI accent colors
                'accent-pink': '#f43f5e',
                'accent-blue': '#3b82f6',
                'accent-cyan': '#00d4ff',
                'accent-purple': '#7c3aed',
                'accent-magenta': '#d946ef',

                // Semantic colors - vibrant
                'success': '#10b981',
                'warning': '#f59e0b',
                'error': '#ef4444',
                'info': '#00d4ff',
            },
            fontFamily: {
                logo: ['Outfit', 'sans-serif'],
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            fontSize: {
                'xxs': '0.65rem',
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(0, 212, 255, 0.3)',
                'glow-lg': '0 0 40px rgba(0, 212, 255, 0.4)',
                'glow-cyan': '0 0 30px rgba(0, 212, 255, 0.25)',
                'glow-purple': '0 0 30px rgba(124, 58, 237, 0.25)',
                'glow-pink': '0 0 30px rgba(244, 63, 94, 0.25)',
                'inner-light': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                'premium': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                'card': '0 4px 20px rgba(0, 0, 0, 0.3)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(0, 212, 255, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(124, 58, 237, 0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(244, 63, 94, 0.1) 0px, transparent 50%)',
                'premium-gradient': 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #f43f5e 100%)',
                'premium-gradient-soft': 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(124, 58, 237, 0.1) 50%, rgba(244, 63, 94, 0.1) 100%)',
                'card-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
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
                'glow-pulse': 'glowPulse 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
                'gradient-shift': 'gradientShift 5s ease infinite',
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
                    '0%': { transform: 'scale(0)', opacity: 0 },
                    '15%': { transform: 'scale(1.4)', opacity: 1 },
                    '30%': { transform: 'scale(0.9)', opacity: 1 },
                    '45%': { transform: 'scale(1.15)', opacity: 1 },
                    '60%': { transform: 'scale(0.95)', opacity: 1 },
                    '75%': { transform: 'scale(1)', opacity: 1 },
                    '100%': { transform: 'scale(1)', opacity: 0 },
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
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
                    '50%': { boxShadow: '0 0 40px rgba(0, 212, 255, 0.5)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                gradientShift: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
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
