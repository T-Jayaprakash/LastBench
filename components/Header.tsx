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
            {/* Premium Glass Background */}
            <div className="absolute inset-0 bg-dark-background/80 backdrop-blur-2xl border-b border-white/5" />

            {/* Gradient accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent-cyan/30 to-transparent" />

            {/* Content */}
            <div className="relative flex justify-between items-center px-4 py-3.5">
                {/* Left spacer */}
                <div className="flex-1" />

                {/* Centered logo with premium gradient */}
                <h1
                    className="absolute left-1/2 transform -translate-x-1/2 text-3xl font-bold select-none tracking-tight"
                    style={{
                        fontFamily: "'Outfit', sans-serif",
                        letterSpacing: '-0.5px',
                        background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #f43f5e 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        textShadow: '0 0 40px rgba(0, 212, 255, 0.3)',
                    }}
                >
                    Genfess
                </h1>

                {/* Right side - Notification Bell */}
                <div className="flex-1 flex justify-end">
                    {user && (
                        <button
                            onClick={onNotificationClick}
                            className="relative p-2.5 rounded-xl text-dark-secondary-text hover:text-dark-primary-text hover:bg-white/5 transition-all duration-200 active:scale-90"
                            aria-label="Notifications"
                        >
                            <BellIcon className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="notification-badge">
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
