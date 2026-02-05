
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
                            className="flex-1 flex items-center justify-center h-full active:opacity-70 transition-opacity"
                            aria-label={item.label}
                        >
                            <item.icon
                                className={`w-[26px] h-[26px] ${isActive ? 'text-white' : 'text-gray-500'}`}
                                fill={isActive ? 'currentColor' : 'none'}
                                strokeWidth={isActive ? 2 : 1.5}
                            />
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;