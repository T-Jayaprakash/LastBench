
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-dark-background relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-30 dark:opacity-20">
                <div
                    className="absolute inset-0 animate-aurora"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.4) 0%, transparent 50%), radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 60% 40%, rgba(236, 72, 153, 0.2) 0%, transparent 50%)',
                        backgroundSize: '200% 200%',
                    }}
                />
            </div>

            {/* Back Button */}
            <button
                onClick={onNavigateToLogin}
                className="absolute top-6 left-6 z-20 p-2 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
            >
                <ArrowLeftIcon className="w-5 h-5 text-primary-text dark:text-dark-primary-text" />
            </button>

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm px-8 animate-fade-in-up">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold font-logo gradient-text mb-3 tracking-tight">
                        Join Genfess
                    </h1>
                    <p className="text-base text-secondary-text dark:text-dark-secondary-text">
                        Connect with your college community
                    </p>
                </div>

                {/* College Only Badge */}
                <div className="flex items-center justify-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                        <span className="text-lg">🎓</span>
                        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
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
                                className={`w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border rounded-xl py-4 px-5 text-base text-primary-text dark:text-dark-primary-text placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${emailError
                                        ? 'border-red-400 focus:ring-red-500/50 focus:border-red-500'
                                        : detectedCollege
                                            ? 'border-green-400 focus:ring-green-500/50 focus:border-green-500'
                                            : 'border-gray-200 dark:border-white/10 focus:ring-violet-500/50 focus:border-violet-500'
                                    }`}
                            />
                            {detectedCollege && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center animate-scale-in">
                                    <CheckIcon className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </div>
                        {emailError && (
                            <p className="text-red-500 text-xs px-1 animate-fade-in">{emailError}</p>
                        )}
                        {!emailError && detectedCollege && (
                            <p className="text-green-600 dark:text-green-400 text-xs px-1 animate-fade-in flex items-center gap-1">
                                ✓ {detectedCollege} email detected
                            </p>
                        )}
                        {!emailTouched && (
                            <p className="text-gray-400 dark:text-gray-500 text-xs px-1">
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
                            className="w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl py-4 px-5 pr-14 text-base text-primary-text dark:text-dark-primary-text placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-300"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1"
                        >
                            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                        <div className="flex gap-1 px-1 animate-fade-in">
                            <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === 'weak' ? 'bg-red-400' : passwordStrength === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                            <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === 'medium' ? 'bg-yellow-400' : passwordStrength === 'strong' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                            <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength === 'strong' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        </div>
                    )}

                    {/* Confirm Password */}
                    <div className="relative group">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t.confirmPasswordPlaceholder}
                            className={`w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border rounded-xl py-4 px-5 pr-14 text-base text-primary-text dark:text-dark-primary-text placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 ${confirmPassword && password !== confirmPassword
                                    ? 'border-red-400 focus:ring-red-500/50 focus:border-red-500'
                                    : 'border-gray-200 dark:border-white/10 focus:ring-violet-500/50 focus:border-violet-500'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1"
                        >
                            {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in">
                            <p className="text-red-500 dark:text-red-400 text-sm text-center font-medium">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!email.trim() || !password.trim() || !confirmPassword.trim() || isLoading || !!emailError}
                        className="relative w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.98] mt-2"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {isLoading && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </span>
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                    <span className="text-xs text-secondary-text dark:text-dark-secondary-text font-medium uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                </div>

                {/* Login Link */}
                <p className="text-center text-secondary-text dark:text-dark-secondary-text">
                    {t.alreadyHaveAccount}{' '}
                    <button
                        onClick={onNavigateToLogin}
                        className="font-bold text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors"
                    >
                        {t.login}
                    </button>
                </p>
            </div>

            {/* Bottom decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
        </div>
    );
};

export default SignUpView;
