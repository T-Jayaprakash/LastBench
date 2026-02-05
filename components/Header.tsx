import React from 'react';
import NotificationBell from './NotificationBell';
import { User } from '../types';

interface HeaderProps {
    onNotificationClick: () => void;
    user: User | null;
}

const Header: React.FC<HeaderProps> = ({ onNotificationClick, user }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5 transition-all duration-300 max-w-md mx-auto">
            <div className="w-full px-4 h-12 flex items-center justify-end">
                {/* Minimal Top Bar - No Branding */}
                <div className="flex items-center gap-4">
                    <NotificationBell userId={user?.userId || ''} />
                </div>
            </div>
        </header>
    );
};

export default Header;
