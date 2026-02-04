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

    // Subscribe to new notifications in realtime using Firebase
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
            className={`absolute top-0 left-0 right-0 z-30 bg-background/95 dark:bg-dark-background/95 backdrop-blur-sm px-4 py-3 border-b border-border-color dark:border-dark-border-color transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'} flex justify-between items-center`}
            style={{ paddingTop: 'max(env(safe-area-inset-top) + 12px, 24px)' }}
        >
            {/* Left spacer */}
            <div className="flex-1"></div>

            {/* Centered logo */}
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-3xl text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 select-none" style={{ fontFamily: "'Satisfy', cursive", letterSpacing: '0.5px' }}>
                Genfess
            </h1>

            {/* Right side - Notification Bell */}
            <div className="flex-1 flex justify-end">
                {user && (
                    <button
                        onClick={onNotificationClick}
                        className="relative p-2 text-primary-text dark:text-dark-primary-text hover:opacity-70 transition-opacity active:scale-95"
                        aria-label="Notifications"
                    >
                        <BellIcon className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
