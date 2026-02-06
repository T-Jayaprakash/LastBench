
import React from 'react';
import { HomeIcon, PlusCircleIcon, UserCircleIcon, HeartIcon, PlayIcon } from './Icons';
import { View } from '../types/index';
import { t } from '../constants/locales';
import { useUnreadNotifications } from '../src/hooks/useUnreadNotifications';

interface BottomNavProps {
    currentView: View;
    setView: (view: View) => void;
    userId?: string;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, userId }) => {
    const unreadCount = useUnreadNotifications(userId);

    const navItems = [
        { view: 'home', icon: HomeIcon, label: t.home, badge: false },
        { view: 'reels', icon: PlayIcon, label: 'Reels', badge: false },
        { view: 'create', icon: PlusCircleIcon, label: t.create, badge: false },
        { view: 'notifications', icon: HeartIcon, label: 'Notifications', badge: unreadCount > 0 },
        { view: 'profile', icon: UserCircleIcon, label: t.profile, badge: false },
    ] as const;

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-black border-t border-white/10"
        >
            <div className="flex justify-around items-center h-12">
                {navItems.map(item => {
                    const isActive = currentView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => {
                                setView(item.view);
                            }}
                            className="flex-1 flex items-center justify-center h-full active:opacity-70 transition-opacity relative"
                            aria-label={item.label}
                        >
                            <div className="relative">
                                <item.icon
                                    className={`w-[26px] h-[26px] ${isActive ? 'text-white' : 'text-gray-500'}`}
                                    fill={isActive ? 'currentColor' : 'none'}
                                    strokeWidth={isActive ? 2 : 1.5}
                                />
                                {item.badge && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF3040] border-2 border-black"></span>
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;