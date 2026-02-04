
import React, { useState, useEffect } from 'react';
import { User } from '../types/index';
import { t } from '../constants/locales';
import { COLLEGES, DEPARTMENTS, AVATAR_COLORS } from '../constants/config';
import { ArrowPathIcon } from '../components/Icons';
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

    // Auto-detect college from user's email using Firebase Auth
    useEffect(() => {
        const getUserEmail = async () => {
            try {
                const currentUser = auth.currentUser;
                if (currentUser?.email) {
                    const detectedCollege = emailVerificationService.getCollegeFromEmail(currentUser.email);
                    if (detectedCollege) {
                        // Auto-fill college
                        setCollege(detectedCollege);
                        console.log(`✅ Auto-detected college from email: ${detectedCollege}`);
                    }
                }
            } catch (e) {
                console.error('Could not auto-detect college:', e);
            }
        };
        getUserEmail();
    }, []);

    // Load existing colleges from DB to populate the list dynamically
    useEffect(() => {
        const loadColleges = async () => {
            try {
                const dbColleges = await userService.getExistingColleges();
                // Combine static list with DB list, remove duplicates, and sort
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

        // Proceed immediately without delay
        onComplete({
            displayName: displayName.trim(),
            avatarColor,
            college: finalCollege,
            department,
        });
    };

    const isSubmitDisabled = !displayName.trim() || (isOtherCollege ? !customCollege.trim() : !college) || !department || isSaving || Object.values(errors).some(e => e);


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-dark-background p-6 animate-fade-in">
            <h1 className="text-4xl font-bold text-primary-text dark:text-dark-primary-text mb-2">{t.onboardingTitle}</h1>
            <p className="mb-8 text-lg text-secondary-text dark:text-dark-secondary-text">{t.onboardingSubtitle}</p>

            <div className="w-full max-w-sm flex flex-col items-center gap-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                    <div
                        className="w-28 h-28 rounded-full flex items-center justify-center text-5xl font-bold text-white dark:text-dark-background cursor-pointer transition-transform duration-200 active:scale-95"
                        style={{ backgroundColor: avatarColor }}
                        onClick={handleAvatarClick}
                    >
                        {(displayName || 'A').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-secondary-text dark:text-dark-secondary-text">{t.avatarLabel}</span>
                </div>

                {/* Form Fields */}
                <div className="w-full flex flex-col gap-4">
                    <div>
                        <label htmlFor="username" className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{t.usernameLabel}</label>
                        <input
                            id="username"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className={`mt-1 w-full bg-gray-100 dark:bg-dark-border-color border rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors ${errors.displayName ? 'border-red-500 focus:ring-red-500' : 'border-border-color dark:border-dark-border-color'}`}
                        />
                        {errors.displayName && <p className="text-red-500 text-xs mt-1 animate-fade-in">{errors.displayName}</p>}
                    </div>
                    <div>
                        <label htmlFor="college" className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{t.collegeLabel}</label>
                        <select
                            id="college"
                            value={college}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCollege(val);
                                setIsOtherCollege(val === 'Other');
                            }}
                            className={`mt-1 w-full bg-gray-100 dark:bg-dark-border-color border rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-accent-primary appearance-none transition-colors ${errors.college && !isOtherCollege ? 'border-red-500 focus:ring-red-500' : 'border-border-color dark:border-dark-border-color'}`}
                        >
                            <option value="" disabled>Select your college</option>
                            {availableColleges.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="Other">Other...</option>
                        </select>
                        {isOtherCollege && (
                            <input
                                type="text"
                                value={customCollege}
                                onChange={e => setCustomCollege(e.target.value)}
                                placeholder="Enter your college name"
                                className={`mt-2 w-full bg-gray-100 dark:bg-dark-border-color border rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-accent-primary transition-colors ${errors.college && isOtherCollege ? 'border-red-500 focus:ring-red-500' : 'border-border-color dark:border-dark-border-color'}`}
                                autoFocus
                            />
                        )}
                        {errors.college && <p className="text-red-500 text-xs mt-1 animate-fade-in">{errors.college}</p>}
                    </div>
                    <div>
                        <label htmlFor="department" className="text-sm font-medium text-secondary-text dark:text-dark-secondary-text">{t.departmentLabel}</label>
                        <select
                            id="department"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className={`mt-1 w-full bg-gray-100 dark:bg-dark-border-color border rounded-lg py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-accent-primary appearance-none transition-colors ${errors.department ? 'border-red-500 focus:ring-red-500' : 'border-border-color dark:border-dark-border-color'}`}
                        >
                            <option value="" disabled>Select your department</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        {errors.department && <p className="text-red-500 text-xs mt-1 animate-fade-in">{errors.department}</p>}
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitDisabled}
                    className="w-full bg-accent-primary hover:bg-accent-secondary text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-4"
                >
                    {isSaving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <span>{t.getStarted}</span>}
                </button>
            </div>
        </div>
    );
};

export default OnboardingView;
