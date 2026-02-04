
import React, { useState } from 'react';
import { t } from '../constants/locales';
import * as userService from '../services/userService';
import { User } from '../types/index';
import { EyeIcon, EyeSlashIcon, ArrowPathIcon } from '../components/Icons';

interface LoginViewProps {
    onLogin: (user: User) => void;
    onNavigateToSignUp: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onNavigateToSignUp }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Organically request notification permission on user interaction
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        if (!email.trim() || !password.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const user = await userService.loginUser(email, password);
            if (user) {
                onLogin(user);
            }
            if (!user) {
                setError('Login failed. Please try again.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred during login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-dark-background relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 opacity-30 dark:opacity-20">
                <div
                    className="absolute inset-0 animate-aurora"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.3) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)',
                        backgroundSize: '200% 200%',
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm px-8 animate-fade-in-up">
                {/* Logo */}
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-extrabold font-logo gradient-text mb-3 tracking-tight">
                        Genfess
                    </h1>
                    <p className="text-lg text-secondary-text dark:text-dark-secondary-text font-medium">
                        {t.splashTagline}
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    {/* Email Input */}
                    <div className="relative group">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="College Email"
                            className="w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl py-4 px-5 text-base text-primary-text dark:text-dark-primary-text placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-300"
                            aria-label="Email"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 -z-10 blur-xl transition-opacity duration-300" />
                    </div>

                    {/* Password Input */}
                    <div className="relative group">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.passwordPlaceholder}
                            className="w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl py-4 px-5 pr-14 text-base text-primary-text dark:text-dark-primary-text placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-300"
                            aria-label={t.passwordPlaceholder}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1"
                        >
                            {showPassword ? (
                                <EyeSlashIcon className="w-5 h-5" />
                            ) : (
                                <EyeIcon className="w-5 h-5" />
                            )}
                        </button>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-pink-500/20 opacity-0 group-focus-within:opacity-100 -z-10 blur-xl transition-opacity duration-300" />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
                            <p className="text-red-500 dark:text-red-400 text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={!email.trim() || !password.trim() || isLoading}
                        className="relative w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-violet-600 disabled:hover:to-purple-600 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.98] overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isLoading && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
                            {isLoading ? t.loggingIn : t.login}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                    <span className="text-xs text-secondary-text dark:text-dark-secondary-text font-medium uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                </div>

                {/* Sign Up Link */}
                <p className="text-center text-secondary-text dark:text-dark-secondary-text">
                    {t.noAccount}{' '}
                    <button
                        onClick={onNavigateToSignUp}
                        className="font-bold text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors"
                    >
                        {t.signUp}
                    </button>
                </p>
            </div>

            {/* Bottom decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
        </div>
    );
};

export default LoginView;
