import React from 'react';
import NotificationBell from './NotificationBell';
import { User } from '../types';

interface HeaderProps {
    onNotificationClick: () => void;
    user: User | null;
}

const Header: React.FC<HeaderProps> = ({ onNotificationClick, user }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 dark:bg-dark-background/95 backdrop-blur-md border-b border-border-color/50 dark:border-dark-border-color/50 transition-all duration-300 shadow-sm max-w-md mx-auto">
            <div className="w-full px-4 h-14 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <img src="/assets/Genfess.png" alt="Logo" className="w-8 h-8 rounded-lg" />
                    <h1
                        className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent-blue via-accent-purple to-accent-pink tracking-tight"
                        style={{ fontFamily: "'Outfit', sans-serif" }}
                    >
                        Genfess
                    </h1>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1">
                    <NotificationBell userId={user?.userId || ''} />
                </div>
            </div>
        </header>
    );
};

export default Header;
