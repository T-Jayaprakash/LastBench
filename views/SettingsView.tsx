
import React, { useState, useEffect } from 'react';
import { User, Theme } from '../types';
import {
    ArrowLeftIcon,
    ArrowRightOnRectangleIcon,
    MoonIcon,
    SunIcon,
    ShareIcon,
    InformationCircleIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    BellIcon,
    UserIcon,
    LockClosedIcon,
    ChatBubbleLeftIcon,
    QuestionMarkCircleIcon,
    ExclamationTriangleIcon,
    HeartIcon,
    StarIcon
} from '../components/Icons';
import { useToast } from '../components/Toast';

interface SettingsViewProps {
    user: User | null;
    onBack: () => void;
    onLogout: () => void;
    theme: Theme;
    toggleTheme: () => void;
}

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
        onClick={onChange}
        className={`w-12 h-7 rounded-full transition-all duration-300 relative ${enabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
    >
        <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${enabled ? 'left-6' : 'left-1'
            }`} />
    </button>
);

const SettingsView: React.FC<SettingsViewProps> = ({ user, onBack, onLogout, theme, toggleTheme }) => {
    const { showToast } = useToast();

    // Settings state
    const [pushNotifications, setPushNotifications] = useState(true);
    const [likeNotifications, setLikeNotifications] = useState(true);
    const [commentNotifications, setCommentNotifications] = useState(true);
    const [debateNotifications, setDebateNotifications] = useState(true);
    const [privateAccount, setPrivateAccount] = useState(false);
    const [showActivity, setShowActivity] = useState(true);
    const [autoPlayVideos, setAutoPlayVideos] = useState(true);
    const [dataSaver, setDataSaver] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('app_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setPushNotifications(settings.pushNotifications ?? true);
            setLikeNotifications(settings.likeNotifications ?? true);
            setCommentNotifications(settings.commentNotifications ?? true);
            setDebateNotifications(settings.debateNotifications ?? true);
            setPrivateAccount(settings.privateAccount ?? false);
            setShowActivity(settings.showActivity ?? true);
            setAutoPlayVideos(settings.autoPlayVideos ?? true);
            setDataSaver(settings.dataSaver ?? false);
        }
    }, []);

    // Save settings to localStorage
    const saveSettings = (key: string, value: boolean) => {
        const savedSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');
        savedSettings[key] = value;
        localStorage.setItem('app_settings', JSON.stringify(savedSettings));
    };

    const handleShareProfile = async () => {
        if (!user) return;
        const profileUrl = `${window.location.origin}/?user=${user.userId}`;
        const shareData = {
            title: `Check out ${user.displayName}'s profile on Genfess`,
            text: `Connect with ${user.displayName} anonymously on Genfess!`,
            url: profileUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                showToast('Profile shared successfully!', 'success');
            } catch (err) {
                console.log('Share canceled');
            }
        } else {
            navigator.clipboard.writeText(profileUrl);
            showToast('Profile link copied to clipboard!', 'success');
        }
    };

    const handleRateApp = () => {
        // Open Play Store or App Store
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isAndroid) {
            window.open('https://play.google.com/store/apps/details?id=com.lastbench.app', '_blank');
        } else if (isIOS) {
            window.open('https://apps.apple.com/app/genfess', '_blank');
        } else {
            showToast('Rate us on the app store!', 'info');
        }
    };

    const handleClearCache = () => {
        try {
            // Clear specific caches but keep user data
            localStorage.removeItem('genfess_feed_cache_v2');
            localStorage.removeItem('debate_cache');
            showToast('Cache cleared successfully!', 'success');
        } catch (e) {
            showToast('Failed to clear cache', 'error');
        }
    };

    const handleDeleteAccount = () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            if (confirm('This will permanently delete all your posts, comments, and data. Continue?')) {
                showToast('Please contact support@genfess.com to delete your account', 'info');
            }
        }
    };

    // Menu item components
    const MenuItem = ({ icon: Icon, label, onClick, danger = false, value, showChevron = true }: any) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 border-b border-white/5 bg-[#121212] active:bg-[#1a1a1a] transition-colors ${danger ? 'text-red-500' : 'text-white'}`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-gray-400'}`} />
                <span className="text-[15px] font-medium">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {value && <span className="text-gray-500 text-sm">{value}</span>}
                {showChevron && !danger && <span className="text-gray-600">›</span>}
            </div>
        </button>
    );

    const ToggleMenuItem = ({ icon: Icon, label, enabled, onChange, description }: any) => (
        <div className="w-full flex items-center justify-between p-4 border-b border-white/5 bg-[#121212]">
            <div className="flex items-center gap-3 flex-1">
                <Icon className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                    <span className="text-[15px] font-medium text-white block">{label}</span>
                    {description && <span className="text-xs text-gray-500">{description}</span>}
                </div>
            </div>
            <ToggleSwitch enabled={enabled} onChange={onChange} />
        </div>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 ml-2 mt-6 first:mt-4">{title}</h2>
    );

    return (
        <div className="flex flex-col h-full bg-black animate-fade-in relative z-50">
            {/* Header */}
            <div className="flex items-center px-4 h-12 border-b border-white/10 bg-black sticky top-0 z-10">
                <button onClick={onBack} className="p-1 -ml-2 text-white hover:opacity-70">
                    <ArrowLeftIcon className="w-6 h-6 stroke-[2px]" />
                </button>
                <h1 className="flex-1 text-center font-semibold text-white text-[16px]">Settings</h1>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 overflow-y-auto pb-20">
                {/* Account Section */}
                <div className="px-4">
                    <SectionHeader title="Account" />
                    <div className="rounded-xl overflow-hidden">
                        <MenuItem
                            icon={UserIcon}
                            label="Account Info"
                            onClick={() => showToast('Account info coming soon', 'info')}
                            value={user?.displayName}
                        />
                        <MenuItem
                            icon={ShareIcon}
                            label="Share Profile"
                            onClick={handleShareProfile}
                        />
                        <MenuItem
                            icon={theme === 'dark' ? SunIcon : MoonIcon}
                            label={`${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                            onClick={toggleTheme}
                        />
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="px-4">
                    <SectionHeader title="Notifications" />
                    <div className="rounded-xl overflow-hidden">
                        <ToggleMenuItem
                            icon={BellIcon}
                            label="Push Notifications"
                            description="Receive alerts on your device"
                            enabled={pushNotifications}
                            onChange={() => {
                                setPushNotifications(!pushNotifications);
                                saveSettings('pushNotifications', !pushNotifications);
                                showToast(`Push notifications ${!pushNotifications ? 'enabled' : 'disabled'}`, 'success');
                            }}
                        />
                        <ToggleMenuItem
                            icon={HeartIcon}
                            label="Likes"
                            description="When someone likes your post"
                            enabled={likeNotifications}
                            onChange={() => {
                                setLikeNotifications(!likeNotifications);
                                saveSettings('likeNotifications', !likeNotifications);
                            }}
                        />
                        <ToggleMenuItem
                            icon={ChatBubbleLeftIcon}
                            label="Comments"
                            description="When someone comments on your post"
                            enabled={commentNotifications}
                            onChange={() => {
                                setCommentNotifications(!commentNotifications);
                                saveSettings('commentNotifications', !commentNotifications);
                            }}
                        />
                        <ToggleMenuItem
                            icon={() => <span className="text-lg">⚔️</span>}
                            label="Debate Alerts"
                            description="New debates and hot takes"
                            enabled={debateNotifications}
                            onChange={() => {
                                setDebateNotifications(!debateNotifications);
                                saveSettings('debateNotifications', !debateNotifications);
                            }}
                        />
                    </div>
                </div>

                {/* Privacy & Security Section */}
                <div className="px-4">
                    <SectionHeader title="Privacy & Security" />
                    <div className="rounded-xl overflow-hidden">
                        <ToggleMenuItem
                            icon={LockClosedIcon}
                            label="Private Account"
                            description="Only approved users can see posts"
                            enabled={privateAccount}
                            onChange={() => {
                                setPrivateAccount(!privateAccount);
                                saveSettings('privateAccount', !privateAccount);
                                showToast(`Account is now ${!privateAccount ? 'private' : 'public'}`, 'success');
                            }}
                        />
                        <ToggleMenuItem
                            icon={UserIcon}
                            label="Show Activity Status"
                            description="Let others see when you're online"
                            enabled={showActivity}
                            onChange={() => {
                                setShowActivity(!showActivity);
                                saveSettings('showActivity', !showActivity);
                            }}
                        />
                        <MenuItem
                            icon={ShieldCheckIcon}
                            label="Blocked Accounts"
                            onClick={() => showToast('No blocked accounts', 'info')}
                        />
                    </div>
                </div>

                {/* Data & Storage Section */}
                <div className="px-4">
                    <SectionHeader title="Data & Storage" />
                    <div className="rounded-xl overflow-hidden">
                        <ToggleMenuItem
                            icon={() => <span className="text-lg">📹</span>}
                            label="Autoplay Videos"
                            enabled={autoPlayVideos}
                            onChange={() => {
                                setAutoPlayVideos(!autoPlayVideos);
                                saveSettings('autoPlayVideos', !autoPlayVideos);
                            }}
                        />
                        <ToggleMenuItem
                            icon={() => <span className="text-lg">📶</span>}
                            label="Data Saver"
                            description="Reduce data usage"
                            enabled={dataSaver}
                            onChange={() => {
                                setDataSaver(!dataSaver);
                                saveSettings('dataSaver', !dataSaver);
                            }}
                        />
                        <MenuItem
                            icon={() => <span className="text-lg">🗑️</span>}
                            label="Clear Cache"
                            onClick={handleClearCache}
                        />
                    </div>
                </div>

                {/* Support Section */}
                <div className="px-4">
                    <SectionHeader title="Support" />
                    <div className="rounded-xl overflow-hidden">
                        <MenuItem
                            icon={QuestionMarkCircleIcon}
                            label="Help Center"
                            onClick={() => window.open('mailto:support@genfess.com?subject=Help Request', '_blank')}
                        />
                        <MenuItem
                            icon={ExclamationTriangleIcon}
                            label="Report a Problem"
                            onClick={() => window.open('mailto:support@genfess.com?subject=Bug Report', '_blank')}
                        />
                        <MenuItem
                            icon={StarIcon}
                            label="Rate App"
                            onClick={handleRateApp}
                        />
                    </div>
                </div>

                {/* About Section */}
                <div className="px-4">
                    <SectionHeader title="About" />
                    <div className="rounded-xl overflow-hidden">
                        <MenuItem
                            icon={InformationCircleIcon}
                            label="About Genfess"
                            onClick={() => window.open('https://genfess.com/about', '_blank')}
                        />
                        <MenuItem
                            icon={ShieldCheckIcon}
                            label="Privacy Policy"
                            onClick={() => window.open('https://genfess.com/privacy', '_blank')}
                        />
                        <MenuItem
                            icon={DocumentTextIcon}
                            label="Terms of Service"
                            onClick={() => window.open('https://genfess.com/terms', '_blank')}
                        />
                    </div>
                </div>

                {/* Logout & Delete Account */}
                <div className="mt-8 px-4">
                    <div className="rounded-xl overflow-hidden">
                        <MenuItem
                            icon={ArrowRightOnRectangleIcon}
                            label="Log Out"
                            onClick={onLogout}
                            danger
                            showChevron={false}
                        />
                    </div>

                    <button
                        onClick={handleDeleteAccount}
                        className="w-full mt-4 p-3 text-red-500/60 text-sm font-medium hover:text-red-500 transition-colors"
                    >
                        Delete Account
                    </button>

                    <p className="text-center text-gray-600 text-xs mt-4 mb-8">
                        Genfess v2.14.0 • Made with ❤️ for college students
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
