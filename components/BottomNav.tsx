
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
            {/* Premium Glass Background */}
            <div className="absolute inset-0 bg-dark-background/80 backdrop-blur-2xl border-t border-white/5" />

            {/* Gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent" />

            {/* Nav Items */}
            <div className="relative flex justify-around items-center h-16">
                {navItems.map(item => {
                    const isActive = currentView === item.view;
                    return (
                        <button
                            key={item.view}
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                setView(item.view);
                            }}
                            className="relative flex flex-col items-center justify-center w-full h-full active:scale-90 transition-all duration-200 group"
                            aria-label={item.label}
                        >
                            {/* Glow effect for active item */}
                            {isActive && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-12 h-12 rounded-full bg-accent-cyan/10 blur-xl" />
                                </div>
                            )}

                            {/* Icon Container */}
                            <div className="relative z-10">
                                <item.icon
                                    className={`w-7 h-7 transition-all duration-300 ${isActive
                                        ? 'text-accent-cyan scale-110'
                                        : 'text-dark-secondary-text group-hover:text-dark-primary-text'
                                        }`}
                                    fill={isActive ? 'currentColor' : 'none'}
                                    strokeWidth={isActive ? 2 : 1.5}
                                />
                            </div>

                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent-cyan shadow-glow-cyan animate-scale-in" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;