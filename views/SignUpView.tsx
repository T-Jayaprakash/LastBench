
import React, { useState, useEffect } from 'react';
import { t } from '../constants/locales';
import * as userService from '../services/userService';
import * as emailVerificationService from '../services/emailVerificationService';
import { User } from '../types/index';
import { EyeIcon, EyeSlashIcon, ArrowPathIcon, CheckIcon, ArrowLeftIcon } from '../components/Icons';

interface SignUpViewProps {
    onSignUp: (user: User) => void;
    onNavigateToLogin: () => void;
}

const SignUpView: React.FC<SignUpViewProps> = ({ onSignUp, onNavigateToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [detectedCollege, setDetectedCollege] = useState<string | null>(null);
    const [emailTouched, setEmailTouched] = useState(false);

    // Validate email in real-time
    useEffect(() => {
        if (!email.trim() || !emailTouched) {
            setEmailError(null);
            setDetectedCollege(null);
            return;
        }

        const validationError = emailVerificationService.getEmailValidationError(email);
        setEmailError(validationError);

        if (!validationError) {
            const college = emailVerificationService.getCollegeFromEmail(email);
            setDetectedCollege(college);
        } else {
            setDetectedCollege(null);
        }
    }, [email, emailTouched]);

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (!emailTouched) {
            setEmailTouched(true);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        setError(null);

        const emailValidation = emailVerificationService.getEmailValidationError(email);
        if (emailValidation) {
            setError(emailValidation);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (!email.trim() || !password.trim() || isLoading) return;

        setIsLoading(true);

        try {
            const user = await userService.signUpUser(email, password);
            if (user) {
                onSignUp(user);
            } else {
                setError('Failed to create account. Please try again.');
            }
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes('already registered')) {
                setError('This email is already registered. Please login instead.');
            } else if (err.message?.includes('invalid e mail')) {
                setError('Please enter a valid college email address.');
            } else {
                setError(err.message || 'An error occurred during sign up.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const passwordStrength = password.length >= 8 ? 'strong' : password.length >= 6 ? 'medium' : 'weak';

    return (
        <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
            style={{ backgroundColor: '#4a0404' }}
        >
            {/* Animated background - Dark Red Theme */}
            <div className="absolute inset-0 opacity-40">
                <div
                    className="absolute inset-0 animate-aurora"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 80% 80%, rgba(139, 30, 30, 0.5) 0%, transparent 50%), radial-gradient(circle at 20% 20%, rgba(180, 40, 40, 0.4) 0%, transparent 50%), radial-gradient(circle at 60% 40%, rgba(100, 20, 20, 0.3) 0%, transparent 50%)',
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

            {/* Back Button */}
            <button
                onClick={onNavigateToLogin}
                className="absolute top-6 left-6 z-20 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
                <ArrowLeftIcon className="w-5 h-5 text-white" />
            </button>

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm px-8 animate-fade-in-up">
                {/* Header */}
                <div className="text-center mb-8">
                    {/* Logo Image */}
                    <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-2xl">
                            <img
                                src="/android/android-launchericon-192-192.png"
                                alt="Genfess Logo"
                                className="w-14 h-14 object-contain"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                    </div>
                    <h1 className="text-4xl font-extrabold font-logo text-white mb-3 tracking-tight drop-shadow-lg">
                        Join Genfess
                    </h1>
                    <p className="text-base text-white/70">
                        Connect with your college community
                    </p>
                </div>

                {/* College Only Badge */}
                <div className="flex items-center justify-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                        <span className="text-lg">🎓</span>
                        <span className="text-sm font-semibold text-white">
                            College students only
                        </span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                    {/* Email Input */}
                    <div className="space-y-1.5">
                        <div className="relative group">
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                placeholder="College Email (student@college.edu)"
                                className={`w-full bg-black/30 backdrop-blur-sm border rounded-xl py-4 px-5 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 transition-all duration-300 ${emailError
                                    ? 'border-red-400 focus:ring-red-500/50 focus:border-red-500'
                                    : detectedCollege
                                        ? 'border-green-400 focus:ring-green-500/50 focus:border-green-500'
                                        : 'border-white/20 focus:ring-white/30 focus:border-white/40'
                                    }`}
                            />
                            {detectedCollege && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                                    <CheckIcon className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </div>
                        {emailError && (
                            <p className="text-red-300 text-xs px-1 animate-fade-in">{emailError}</p>
                        )}
                        {!emailError && detectedCollege && (
                            <p className="text-green-300 text-xs px-1 animate-fade-in flex items-center gap-1">
                                ✓ {detectedCollege} email detected
                            </p>
                        )}
                        {!emailTouched && (
                            <p className="text-white/40 text-xs px-1">
                                Use your college-provided email
                            </p>
                        )}
                    </div>

                    {/* Password Input */}
                    <div className="relative group">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.passwordPlaceholder}
                            className="w-full bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl py-4 px-5 pr-14 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all duration-300"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
                        >
                            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                        <div className="flex gap-1 px-1 animate-fade-in">
                            <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === 'weak' ? 'bg-red-400' : passwordStrength === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                            <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === 'medium' ? 'bg-yellow-400' : passwordStrength === 'strong' ? 'bg-green-400' : 'bg-white/20'}`} />
                            <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === 'strong' ? 'bg-green-400' : 'bg-white/20'}`} />
                        </div>
                    )}

                    {/* Confirm Password */}
                    <div className="relative group">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t.confirmPasswordPlaceholder}
                            className={`w-full bg-black/30 backdrop-blur-sm border rounded-xl py-4 px-5 pr-14 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 transition-all duration-300 ${confirmPassword && password !== confirmPassword
                                ? 'border-red-400 focus:ring-red-500/50 focus:border-red-500'
                                : 'border-white/20 focus:ring-white/30 focus:border-white/40'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
                        >
                            {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 animate-fade-in backdrop-blur-sm">
                            <p className="text-red-200 text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!email.trim() || !password.trim() || !confirmPassword.trim() || isLoading || !!emailError}
                        className="relative w-full bg-white text-[#4a0404] font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/30 hover:bg-white/90 active:scale-[0.98] mt-2"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {isLoading && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </span>
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <span className="text-xs text-white/50 font-medium uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>

                {/* Login Link */}
                <p className="text-center text-white/70">
                    {t.alreadyHaveAccount}{' '}
                    <button
                        onClick={onNavigateToLogin}
                        className="font-bold text-white hover:text-white/80 transition-colors underline underline-offset-2"
                    >
                        {t.login}
                    </button>
                </p>
            </div>

            {/* Bottom decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </div>
    );
};

export default SignUpView;
