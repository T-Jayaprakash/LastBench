import React, { useState, useEffect } from 'react';
import { User } from '../types/index';
import { BellIcon } from './Icons';
import * as notificationService from '../services/notificationService';
import { useNotificationsRealtime } from '../src/hooks/useFirebaseRealtime';

interface HeaderProps {
    isVisible?: boolean;
    user?: User | null;
    onNotificationClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isVisible = true, user, onNotificationClick }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch initial unread count
    useEffect(() => {
        if (!user) return;
        const fetchUnreadCount = async () => {
            const count = await notificationService.getUnreadCount(user.userId);
            setUnreadCount(count);
        };
        fetchUnreadCount();
    }, [user]);

    // Subscribe to new notifications in realtime
    useNotificationsRealtime({
        userId: user?.userId || '',
        onNewNotification: () => {
            setUnreadCount(prev => prev + 1);
        },
        onUpdated: (notificationId, read) => {
            if (read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        },
        enabled: !!user?.userId,
    });

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-smooth ${isVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            {/* Glass background */}
            <div className="absolute inset-0 bg-white/80 dark:bg-black/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5" />

            {/* Content */}
            <div className="relative flex justify-between items-center px-4 py-3">
                {/* Left spacer */}
                <div className="flex-1" />

                {/* Centered logo with gradient */}
                <h1
                    className="absolute left-1/2 transform -translate-x-1/2 text-3xl font-bold select-none"
                    style={{
                        fontFamily: "'Satisfy', cursive",
                        letterSpacing: '0.5px',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 50%, #EC4899 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    Genfess
                </h1>

                {/* Right side - Notification Bell */}
                <div className="flex-1 flex justify-end">
                    {user && (
                        <button
                            onClick={onNotificationClick}
                            className="relative p-2.5 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 active:scale-90"
                            aria-label="Notifications"
                        >
                            <BellIcon className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] flex items-center justify-center px-1 text-[11px] font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-full shadow-lg shadow-rose-500/30 animate-scale-in">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
