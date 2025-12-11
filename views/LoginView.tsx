
import React, { useState } from 'react';
import { t } from '../constants/locales';
import * as userService from '../services/userService';
import { User } from '../types/index';
import { EyeIcon, EyeSlashIcon } from '../components/Icons';

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

        // Organically request notification permission on user interaction (like social media apps)
        if ('Notification' in window && Notification.permission === 'default') {
            // We don't await this to keep the login flow snappy
            Notification.requestPermission();
        }

        if (!email.trim() || !password.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const user = await userService.loginUser(email, password);
            if (user) {
                onLogin(user);
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred during login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-dark-background p-8 animate-fade-in">
            <h1 className="text-5xl font-bold text-primary-text dark:text-dark-primary-text mb-4" style={{ fontFamily: "'Roboto', sans-serif" }}>Genfess</h1>
            <p className="mb-12 text-xl text-secondary-text dark:text-dark-secondary-text">{t.splashTagline}</p>

            <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-gray-100 dark:bg-dark-border-color border border-border-color dark:border-dark-border-color rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    aria-label="Email"
                />
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t.passwordPlaceholder}
                        className="w-full bg-gray-100 dark:bg-dark-border-color border border-border-color dark:border-dark-border-color rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-accent-primary pr-12"
                        aria-label={t.passwordPlaceholder}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        {showPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                            <EyeIcon className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button
                    type="submit"
                    disabled={!email.trim() || !password.trim() || isLoading}
                    className="w-full bg-accent-primary hover:bg-accent-secondary text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                    {isLoading ? t.loggingIn : t.login}
                </button>
            </form>
            <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-6">
                {t.noAccount} <button onClick={onNavigateToSignUp} className="font-bold text-accent-primary hover:underline">{t.signUp}</button>
            </p>
        </div>
    );
};

export default LoginView;
