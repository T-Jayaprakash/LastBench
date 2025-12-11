
import React, { useState, useEffect } from 'react';
import { t } from '../constants/locales';
import * as userService from '../services/userService';
import * as emailVerificationService from '../services/emailVerificationService';
import { User } from '../types/index';
import { EyeIcon, EyeSlashIcon } from '../components/Icons';

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
            // Email is valid college email, detect college name
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

        // Organically request notification permission on user interaction
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        setError(null);

        // Validate college email
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

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-dark-background p-8 animate-fade-in">
            <h1 className="text-5xl font-bold text-primary-text dark:text-dark-primary-text mb-4" style={{ fontFamily: "'Roboto', sans-serif" }}>Genfess</h1>
            <p className="mb-6 text-xl text-secondary-text dark:text-dark-secondary-text">{t.splashTagline}</p>
            <p className="mb-8 text-sm text-accent-primary font-semibold px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-accent-primary/30">
                🎓 Only college students can join
            </p>

            <form onSubmit={handleSignUp} className="w-full max-w-sm flex flex-col gap-4">
                <div>
                    <input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="College Email (e.g., student@college.edu)"
                        className={`w-full bg-gray-100 dark:bg-dark-border-color border rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 transition-colors ${emailError
                            ? 'border-red-500 focus:ring-red-500'
                            : detectedCollege
                                ? 'border-green-500 focus:ring-green-500'
                                : 'border-border-color dark:border-dark-border-color focus:ring-accent-primary'
                            }`}
                        aria-label="College Email"
                    />
                    {emailError && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">{emailError}</p>
                    )}
                    {!emailError && detectedCollege && (
                        <p className="text-green-600 dark:text-green-400 text-xs mt-1 animate-fade-in flex items-center gap-1">
                            <span className="text-green-500">✓</span> {detectedCollege} email detected
                        </p>
                    )}
                    {!emailTouched && (
                        <p className="text-secondary-text dark:text-dark-secondary-text text-xs mt-1">
                            Use your college-provided email address
                        </p>
                    )}
                </div>
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
                <div className="relative">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.confirmPasswordPlaceholder}
                        className="w-full bg-gray-100 dark:bg-dark-border-color border border-border-color dark:border-dark-border-color rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-accent-primary pr-12"
                        aria-label={t.confirmPasswordPlaceholder}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        {showConfirmPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                            <EyeIcon className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {error && <p className="text-red-500 text-sm text-center -mt-2">{error}</p>}
                <button
                    type="submit"
                    disabled={!email.trim() || !password.trim() || !confirmPassword.trim() || isLoading || !!emailError}
                    className="w-full bg-accent-primary hover:bg-accent-secondary text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                    {isLoading ? 'Creating Account...' : t.signUp}
                </button>
            </form>
            <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-6">
                {t.alreadyHaveAccount} <button onClick={onNavigateToLogin} className="font-bold text-accent-primary hover:underline">{t.login}</button>
            </p>
        </div>
    );
};

export default SignUpView;
