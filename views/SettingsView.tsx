
import React from 'react';
import { User, Theme } from '../types';
import { ArrowLeftIcon, ArrowRightOnRectangleIcon, MoonIcon, SunIcon, ShareIcon, InformationCircleIcon, DocumentTextIcon, ShieldCheckIcon } from '../components/Icons';
import { useToast } from '../components/Toast';

interface SettingsViewProps {
    user: User | null;
    onBack: () => void;
    onLogout: () => void;
    theme: Theme;
    toggleTheme: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ user, onBack, onLogout, theme, toggleTheme }) => {
    const { showToast } = useToast();

    const handleShareProfile = async () => {
        if (!user) return;
        const profileUrl = `${window.location.origin}/?user=${user.userId}`; // Or specialized profile link logic
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

    const MenuItem = ({ icon: Icon, label, onClick, danger = false }: any) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 border-b border-white/5 bg-[#121212] active:bg-[#1a1a1a] transition-colors ${danger ? 'text-red-500' : 'text-white'}`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-6 h-6 stroke-[1.5px] ${danger ? 'text-red-500' : 'text-white'}`} />
                <span className="text-[15px] font-medium">{label}</span>
            </div>
            {!danger && <span className="text-gray-500">›</span>}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-black animate-fade-in relative z-50">
            {/* Header */}
            <div className="flex items-center px-4 h-12 border-b border-white/10 bg-black">
                <button onClick={onBack} className="p-1 -ml-2 text-white hover:opacity-70">
                    <ArrowLeftIcon className="w-6 h-6 stroke-[2px]" />
                </button>
                <h1 className="flex-1 text-center font-semibold text-white text-[16px]">Settings</h1>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="mt-4 px-4 pb-2">
                    <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 ml-2">Account</h2>
                    <div className="rounded-xl overflow-hidden">
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

                <div className="mt-4 px-4 pb-2">
                    <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 ml-2">About</h2>
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

                <div className="mt-8 px-4">
                    <div className="rounded-xl overflow-hidden border border-red-900/30">
                        <MenuItem
                            icon={ArrowRightOnRectangleIcon}
                            label="Log Out"
                            onClick={onLogout}
                            danger
                        />
                    </div>
                    <p className="text-center text-gray-600 text-xs mt-4">
                        Genfess v2.13.0
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
