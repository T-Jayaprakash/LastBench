
import React, { useState, useEffect } from 'react';
import { User } from '../types/index';
import { t } from '../constants/locales';
import { COLLEGES, DEPARTMENTS, AVATAR_COLORS } from '../constants/config';
import { ArrowPathIcon, CheckIcon } from '../components/Icons';
import * as userService from '../services/userService';
import * as emailVerificationService from '../services/emailVerificationService';
import { auth } from '../services/firebase';

interface OnboardingViewProps {
    user: User;
    onComplete: (updatedData: { displayName: string, college: string, department: string, avatarColor: string }) => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onComplete }) => {
    const [displayName, setDisplayName] = useState(user.displayName);
    const [avatarColor, setAvatarColor] = useState(user.avatarColor);
    const [college, setCollege] = useState('');
    const [department, setDepartment] = useState('');
    const [isOtherCollege, setIsOtherCollege] = useState(false);
    const [customCollege, setCustomCollege] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
    const [availableColleges, setAvailableColleges] = useState<string[]>(COLLEGES);

    useEffect(() => {
        const getUserEmail = async () => {
            try {
                const currentUser = auth.currentUser;
                if (currentUser?.email) {
                    const detectedCollege = emailVerificationService.getCollegeFromEmail(currentUser.email);
                    if (detectedCollege) {
                        setCollege(detectedCollege);
                    }
                }
            } catch (e) {
                console.error('Could not auto-detect college:', e);
            }
        };
        getUserEmail();
    }, []);

    useEffect(() => {
        const loadColleges = async () => {
            try {
                const dbColleges = await userService.getExistingColleges();
                const uniqueColleges = Array.from(new Set([...COLLEGES, ...dbColleges])).sort();
                setAvailableColleges(uniqueColleges);
            } catch (e) {
                console.error("Failed to load colleges", e);
            }
        };
        loadColleges();
    }, []);

    useEffect(() => {
        const newErrors: { [key: string]: string | null } = {};

        if (!displayName.trim()) {
            newErrors.displayName = "Display name cannot be empty.";
        } else if (displayName.trim().length < 3) {
            newErrors.displayName = "Must be at least 3 characters.";
        }

        if (isOtherCollege) {
            if (!customCollege.trim()) {
                newErrors.college = "Please enter your college name.";
            }
        } else {
            if (!college) {
                newErrors.college = "Please select a college.";
            }
        }

        if (!department) {
            newErrors.department = "Please select a department.";
        }

        setErrors(newErrors);
    }, [displayName, college, customCollege, isOtherCollege, department]);

    const handleAvatarClick = () => {
        const currentIndex = AVATAR_COLORS.indexOf(avatarColor);
        const nextIndex = (currentIndex + 1) % AVATAR_COLORS.length;
        setAvatarColor(AVATAR_COLORS[nextIndex]);
    };

    const handleSubmit = async () => {
        const finalCollege = isOtherCollege ? customCollege.trim() : college;
        if (!displayName.trim() || !finalCollege || !department || isSaving || Object.values(errors).some(e => e)) return;

        setIsSaving(true);
        onComplete({
            displayName: displayName.trim(),
            avatarColor,
            college: finalCollege,
            department,
        });
    };

    const isSubmitDisabled = !displayName.trim() || (isOtherCollege ? !customCollege.trim() : !college) || !department || isSaving || Object.values(errors).some(e => e);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-dark-background relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-20 dark:opacity-10">
                <div
                    className="absolute inset-0 animate-aurora"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 60%)',
                        backgroundSize: '100% 100%',
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-sm px-8 animate-fade-in-up">
                <h1 className="text-4xl font-bold font-logo gradient-text text-center mb-2">Welcome!</h1>
                <p className="text-center text-secondary-text dark:text-dark-secondary-text mb-8">Let's set up your profile</p>

                <div className="flex flex-col items-center gap-8">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3 group">
                        <div
                            className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold text-white shadow-2xl transition-all duration-300 transform group-hover:scale-105 cursor-pointer relative overflow-hidden"
                            style={{ backgroundColor: avatarColor }}
                            onClick={handleAvatarClick}
                        >
                            <span className="relative z-10">{(displayName || 'A').charAt(0).toUpperCase()}</span>
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-xs font-medium uppercase tracking-wider text-white">Change</span>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-secondary-text dark:text-dark-secondary-text uppercase tracking-wider">Tap to change color</span>
                    </div>

                    {/* Form Fields */}
                    <div className="w-full flex flex-col gap-5">
                        <div className="space-y-1">
                            <label htmlFor="username" className="text-xs font-bold uppercase tracking-wider text-secondary-text dark:text-dark-secondary-text ml-1">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className={`w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border rounded-xl py-4 px-5 text-base focus:outline-none focus:ring-2 transition-all duration-300 ${errors.displayName
                                        ? 'border-red-400 focus:ring-red-500/50'
                                        : 'border-gray-200 dark:border-white/10 focus:ring-violet-500/50'
                                    }`}
                            />
                            {errors.displayName && <p className="text-red-500 text-xs ml-1 font-medium">{errors.displayName}</p>}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="college" className="text-xs font-bold uppercase tracking-wider text-secondary-text dark:text-dark-secondary-text ml-1">College</label>
                            <div className="relative">
                                <select
                                    id="college"
                                    value={college}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setCollege(val);
                                        setIsOtherCollege(val === 'Other');
                                    }}
                                    className={`w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border rounded-xl py-4 px-5 text-base appearance-none focus:outline-none focus:ring-2 transition-all duration-300 ${errors.college && !isOtherCollege
                                            ? 'border-red-400 focus:ring-red-500/50'
                                            : 'border-gray-200 dark:border-white/10 focus:ring-violet-500/50'
                                        }`}
                                >
                                    <option value="" disabled>Select your college</option>
                                    {availableColleges.map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="Other">Other...</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {isOtherCollege && (
                                <input
                                    type="text"
                                    value={customCollege}
                                    onChange={e => setCustomCollege(e.target.value)}
                                    placeholder="Enter college name"
                                    className="mt-3 w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl py-4 px-5 text-base focus:outline-none focus:ring-2 focus:ring-violet-500/50 animate-fade-in"
                                    autoFocus
                                />
                            )}
                            {errors.college && <p className="text-red-500 text-xs ml-1 font-medium">{errors.college}</p>}
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="department" className="text-xs font-bold uppercase tracking-wider text-secondary-text dark:text-dark-secondary-text ml-1">Department</label>
                            <div className="relative">
                                <select
                                    id="department"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    className={`w-full bg-white/80 dark:bg-white/5 backdrop-blur-sm border rounded-xl py-4 px-5 text-base appearance-none focus:outline-none focus:ring-2 transition-all duration-300 ${errors.department
                                            ? 'border-red-400 focus:ring-red-500/50'
                                            : 'border-gray-200 dark:border-white/10 focus:ring-violet-500/50'
                                        }`}
                                >
                                    <option value="" disabled>Select your department</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {errors.department && <p className="text-red-500 text-xs ml-1 font-medium">{errors.department}</p>}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitDisabled}
                        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                    >
                        {isSaving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <span>Start Exploring</span>}
                        {!isSaving && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingView;
