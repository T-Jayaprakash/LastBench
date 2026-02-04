
import React from 'react';
import { HomeIcon, PlusCircleIcon, UserCircleIcon } from './Icons';
import { View } from '../types/index';
import { t } from '../constants/locales';

interface BottomNavProps {
    currentView: View;
    setView: (view: View) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
    const navItems = [
        { view: 'home', icon: HomeIcon, label: t.home },
        { view: 'create', icon: PlusCircleIcon, label: t.create },
        { view: 'profile', icon: UserCircleIcon, label: t.profile },
    ] as const;

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 pb-[env(safe-area-inset-bottom)]"
        >
            {/* Glass Background */}
            <div className="absolute inset-0 bg-white/80 dark:bg-black/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-white/10" />

            {/* Nav Items */}
            <div className="relative flex justify-around items-center h-14">
                {navItems.map(item => {
                    const isActive = currentView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                setView(item.view);
                            }}
                            className="relative flex flex-col items-center justify-center w-full h-full active:scale-90 transition-transform duration-200 group"
                            aria-label={item.label}
                        >
                            {/* Icon */}
                            <div className="relative">
                                <item.icon
                                    className={`w-7 h-7 transition-all duration-300 ${isActive
                                            ? 'text-primary-text dark:text-white scale-110 drop-shadow-md'
                                            : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400'
                                        }`}
                                    fill={isActive ? 'currentColor' : 'none'}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />

                                {/* Active Indicator Dot */}
                                {isActive && (
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-text dark:bg-white animate-scale-in" />
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