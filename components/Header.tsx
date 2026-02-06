import React from 'react';
import NotificationBell from './NotificationBell';
import { User } from '../types';

interface HeaderProps {
    onNotificationClick: () => void;
    user: User | null;
}

const Header: React.FC<HeaderProps> = ({ onNotificationClick, user }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent transition-all duration-300">
            <div className="w-full px-4 h-12 flex items-center justify-between">
                {/* Left: Spacer / Brand Placeholder (Hidden) */}
                <div className="w-8"></div>

                {/* Center: Empty or maybe "For You" / "Following" later */}
                <div className="flex-1"></div>

                {/* Right: Placeholder for future icons (e.g. DMs) */}
                <div className="flex items-center w-8">
                </div>
            </div>
        </header>
    );
};

export default Header;
