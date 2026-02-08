
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
        <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
            style={{ backgroundColor: '#E53935' }}
        >
            {/* Animated background gradient - Dark Red Theme */}
            <div className="absolute inset-0 opacity-40">
                <div
                    className="absolute inset-0 animate-aurora"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(139, 30, 30, 0.5) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(180, 40, 40, 0.4) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(100, 20, 20, 0.3) 0%, transparent 50%)',
                        backgroundSize: '200% 200%',
                    }}
                />
            </div>

            {/* Subtle patterns overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm px-8 animate-fade-in-up">
                {/* Logo with Genfess branding */}
                <div className="text-center mb-12">
                    {/* Logo Image */}
                    <div className="flex justify-center mb-6">
                        <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
                            <img
                                src="/android/android-launchericon-192-192.png"
                                alt="Genfess Logo"
                                className="w-16 h-16 object-contain"
                                onError={(e) => {
                                    // Fallback to text if image fails
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    </div>
                    <h1 className="text-5xl font-extrabold font-logo text-white mb-3 tracking-tight drop-shadow-lg">
                        Genfess
                    </h1>
                    <p className="text-lg text-white/70 font-medium">
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
                            className="w-full bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl py-4 px-5 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                            aria-label="Email"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600/20 to-red-400/20 opacity-0 group-focus-within:opacity-100 -z-10 blur-xl transition-opacity duration-300" />
                    </div>

                    {/* Password Input */}
                    <div className="relative group">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.passwordPlaceholder}
                            className="w-full bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl py-4 px-5 pr-14 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                            aria-label={t.passwordPlaceholder}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
                        >
                            {showPassword ? (
                                <EyeSlashIcon className="w-5 h-5" />
                            ) : (
                                <EyeIcon className="w-5 h-5" />
                            )}
                        </button>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600/20 to-red-400/20 opacity-0 group-focus-within:opacity-100 -z-10 blur-xl transition-opacity duration-300" />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 animate-fade-in backdrop-blur-sm">
                            <p className="text-red-200 text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={!email.trim() || !password.trim() || isLoading}
                        className="relative w-full bg-white text-[#E53935] font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/30 hover:bg-white/90 active:scale-[0.98] overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isLoading && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
                            {isLoading ? t.loggingIn : t.login}
                        </span>
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <span className="text-xs text-white/50 font-medium uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>

                {/* Sign Up Link */}
                <p className="text-center text-white/70">
                    {t.noAccount}{' '}
                    <button
                        onClick={onNavigateToSignUp}
                        className="font-bold text-white hover:text-white/80 transition-colors underline underline-offset-2"
                    >
                        {t.signUp}
                    </button>
                </p>
            </div>

            {/* Bottom decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </div>
    );
};

export default LoginView;
