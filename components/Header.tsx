import React from 'react';
import NotificationBell from './NotificationBell';
import { User } from '../types';

interface HeaderProps {
    onNotificationClick: () => void;
    user: User | null;
}

const Header: React.FC<HeaderProps> = ({ onNotificationClick, user }) => {
    return (
        <header
            className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5 transition-all duration-300"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
        >
            <div className="w-full px-4 h-11 flex items-center justify-between">
                {/* Left: Spacer to balance the layout */}
                <div className="w-8"></div>

                {/* Center: Brand Title */}
                <div className="flex flex-col items-center justify-center -space-y-0.5">
                    <h1 className="text-xl font-black tracking-tighter text-white select-none relative">
                        GENFESS
                        <span className="absolute -top-1 -right-2 text-[7px] text-cyan-400 font-bold">IN</span>
                    </h1>
                    <span className="text-[7px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                        {user?.college?.split(' ')[0] || 'CAMPUS'}
                    </span>
                </div>

                {/* Right: Notification Bell */}
                <div className="flex items-center justify-end w-8">
                    <NotificationBell hasUnread={false} onClick={onNotificationClick} />
                </div>
            </div>
        </header>
    );
};

export default Header;
