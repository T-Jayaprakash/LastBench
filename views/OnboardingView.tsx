
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from '../types/index';
import { COLLEGES, DEPARTMENTS, AVATAR_COLORS } from '../constants/config';
import { ArrowPathIcon, ArrowLeftIcon, CheckIcon } from '../components/Icons';
import * as userService from '../services/userService';
import { uploadAvatar } from '../services/userService';
import * as emailVerificationService from '../services/emailVerificationService';
import { auth } from '../services/firebase';

interface OnboardingViewProps {
    user: User;
    onComplete: (updatedData: { displayName: string, college: string, department: string, avatarColor: string, avatarUrl?: string }) => void;
}

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);

const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onComplete }) => {
    // Form State
    const [displayName, setDisplayName] = useState(user.displayName);
    const [avatarColor, setAvatarColor] = useState(user.avatarColor || '#262626');
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatarUrl);
    const [isUploading, setIsUploading] = useState(false);

    const [college, setCollege] = useState('');
    const [department, setDepartment] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Data State
    const [availableColleges, setAvailableColleges] = useState<string[]>(COLLEGES);

    // Selector State
    const [selectorMode, setSelectorMode] = useState<'COLLEGE' | 'DEPT' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const getUserEmail = async () => {
            try {
                const currentUser = auth.currentUser;
                if (currentUser?.email) {
                    const detectedCollege = emailVerificationService.getCollegeFromEmail(currentUser.email);
                    if (detectedCollege) setCollege(detectedCollege);
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

    // Filter Logic
    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const list = selectorMode === 'COLLEGE' ? availableColleges : DEPARTMENTS;
        return list.filter(item => item.toLowerCase().includes(query));
    }, [selectorMode, searchQuery, availableColleges]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        setIsUploading(true);
        try {
            const url = await uploadAvatar(file);
            if (url) {
                setAvatarUrl(url);
            }
        } catch (error) {
            console.error('Avatar upload failed:', error);
            alert('Failed to upload image.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelect = (item: string) => {
        if (selectorMode === 'COLLEGE') setCollege(item);
        if (selectorMode === 'DEPT') setDepartment(item);
        setSelectorMode(null);
        setSearchQuery('');
    };

    const handleSubmit = async () => {
        if (!displayName.trim() || !college || !department || isSaving) return;

        setIsSaving(true);
        onComplete({
            displayName: displayName.trim(),
            avatarColor,
            avatarUrl,
            college,
            department,
        });
    };

    const getLocationSubtitle = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('trichy')) return 'Tiruchirappalli, India';
        if (n.includes('madras') || n.includes('anna') || n.includes('ceg')) return 'Chennai, India';
        if (n.includes('vellore')) return 'Vellore, India';
        if (n.includes('coimbatore') || n.includes('psg')) return 'Coimbatore, India';
        if (n.includes('srm')) return 'Kattankulathur, India';
        return 'Campus';
    };

    const isFormValid = displayName.trim().length >= 3 && college && department;

    // Full Screen Selector Overlay - Dark Red Theme
    if (selectorMode) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col animate-fade-in"
                style={{ backgroundColor: '#4a0404' }}
            >
                {/* Search Header */}
                <div className="flex items-center px-4 py-3 border-b border-white/10 gap-3">
                    <button
                        onClick={() => { setSelectorMode(null); setSearchQuery(''); }}
                        className="p-1 -ml-2 text-white/90 hover:opacity-70"
                    >
                        <ArrowLeftIcon className="w-6 h-6 stroke-[2px]" />
                    </button>
                    <div className="flex-1 relative">
                        <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={selectorMode === 'COLLEGE' ? "Search for your college" : "Search department"}
                            className="w-full bg-transparent text-white text-[16px] placeholder:text-white/40 font-normal outline-none border-none p-0"
                        />
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {filteredItems.length === 0 ? (
                        <div className="px-5 py-4 text-white/50 text-sm">No results found for "{searchQuery}"</div>
                    ) : (
                        filteredItems.map((item) => (
                            <button
                                key={item}
                                onClick={() => handleSelect(item)}
                                className="w-full text-left px-5 py-3.5 border-b border-white/5 active:bg-white/10 flex items-center justify-between group transition-colors"
                            >
                                <div>
                                    <div className="text-white text-[15px] font-medium leading-snug">{item}</div>
                                    <div className="text-white/50 text-[12px] leading-snug">
                                        {selectorMode === 'COLLEGE' ? getLocationSubtitle(item) : 'Academic Department'}
                                    </div>
                                </div>
                                {(selectorMode === 'COLLEGE' && college === item) || (selectorMode === 'DEPT' && department === item) ? (
                                    <CheckIcon className="w-5 h-5 text-white" />
                                ) : null}
                            </button>
                        ))
                    )}

                    {/* Custom option */}
                    {searchQuery && filteredItems.length === 0 && selectorMode === 'COLLEGE' && (
                        <button
                            onClick={() => handleSelect(searchQuery)}
                            className="w-full text-left px-5 py-4 text-white font-medium text-sm"
                        >
                            Can't find it? Tap to use "{searchQuery}"
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center min-h-screen text-white px-8 pt-16"
            style={{ backgroundColor: '#4a0404' }}
        >
            {/* Subtle patterns overlay */}
            <div className="fixed inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            <div className="w-full max-w-[350px] flex flex-col items-center relative z-10">

                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-10">
                    <div
                        className="relative w-[110px] h-[110px] rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden cursor-pointer"
                        onClick={handleAvatarClick}
                    >
                        {isUploading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            // Neutral placeholder
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="rgba(255,255,255,0.5)" className="w-16 h-16">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                        )}
                    </div>

                    <button
                        onClick={handleAvatarClick}
                        className="mt-3 text-white text-[13px] font-bold active:opacity-60 transition-opacity underline underline-offset-2"
                    >
                        {avatarUrl ? 'Change profile photo' : 'Add profile photo'}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Form Fields */}
                <div className="w-full space-y-4">
                    <div className="w-full bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl focus-within:border-white/40 transition-colors">
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Username"
                            className="w-full bg-transparent text-base py-3.5 px-4 text-white placeholder:text-white/40 focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={() => setSelectorMode('COLLEGE')}
                        className="w-full bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl focus-within:border-white/40 transition-colors text-left py-3.5 px-4 flex items-center justify-between group active:bg-white/10"
                    >
                        <span className={`text-base ${college ? 'text-white' : 'text-white/40'}`}>
                            {college || "Select College"}
                        </span>
                        <span className="text-white/40 text-xs group-hover:text-white/60">▼</span>
                    </button>

                    <button
                        onClick={() => setSelectorMode('DEPT')}
                        className="w-full bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl focus-within:border-white/40 transition-colors text-left py-3.5 px-4 flex items-center justify-between group active:bg-white/10"
                    >
                        <span className={`text-base ${department ? 'text-white' : 'text-white/40'}`}>
                            {department || "Select Department"}
                        </span>
                        <span className="text-white/40 text-xs group-hover:text-white/60">▼</span>
                    </button>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!isFormValid || isSaving}
                    className="w-full mt-6 bg-white text-[#4a0404] text-base font-bold py-3.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-colors flex justify-center items-center shadow-lg shadow-black/30"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-[#4a0404]/30 border-t-[#4a0404] rounded-full animate-spin" />
                    ) : (
                        "Complete Setup"
                    )}
                </button>

                <p className="text-white/50 text-xs text-center mt-6 leading-relaxed">
                    By continuing, you agree to keep this community helpful and anonymous.
                </p>
            </div>
        </div>
    );
};

export default OnboardingView;
