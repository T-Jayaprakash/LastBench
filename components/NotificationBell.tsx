/**
 * ============================================================================
 * NOTIFICATION BELL COMPONENT
 * ============================================================================
 * 
 * Instagram-style notification bell with real-time updates
 * Uses Firebase Firestore for notifications
 * 
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { NotificationWithPost } from '../types/notifications';
import { BellIcon, XMarkIcon } from './Icons';
import { useNotificationsRealtime } from '../src/hooks/useFirebaseRealtime';
import * as notificationService from '../services/notificationService';

interface NotificationBellProps {
    userId: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationWithPost[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch initial unread count
    useEffect(() => {
        const fetchUnreadCount = async () => {
            const count = await notificationService.getUnreadCount(userId);
            setUnreadCount(count);
        };
        if (userId) {
            fetchUnreadCount();
        }
    }, [userId]);

    // Subscribe to new notifications in realtime using Firebase
    useNotificationsRealtime({
        userId,
        onNewNotification: (notification) => {
            setUnreadCount(prev => prev + 1);
            // Optionally vibrate on new notification
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        },
        onUpdated: (notificationId, read) => {
            if (read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        },
        enabled: !!userId,
    });

    const handleOpenNotifications = async () => {
        setIsOpen(true);
        setLoading(true);

        const notifs = await notificationService.getNotifications(userId, 50);
        setNotifications(notifs);
        setLoading(false);
    };

    const handleMarkAllRead = async () => {
        const success = await notificationService.markAllNotificationsRead(userId);
        if (success) {
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };

    const getNotificationText = (notif: NotificationWithPost): string => {
        switch (notif.type) {
            case 'like':
                return `liked your post`;
            case 'comment':
                return `commented: ${notif.content?.substring(0, 40)}${notif.content && notif.content.length > 40 ? '...' : ''}`;
            case 'reply':
                return `replied to your comment`;
            case 'mention':
                return `mentioned you`;
            default:
                return 'sent you a notification';
        }
    };

    const timeAgo = (date: Date): string => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return `${Math.floor(interval)}y`;
        interval = seconds / 2592000;
        if (interval > 1) return `${Math.floor(interval)}mo`;
        interval = seconds / 86400;
        if (interval > 1) return `${Math.floor(interval)}d`;
        interval = seconds / 3600;
        if (interval > 1) return `${Math.floor(interval)}h`;
        interval = seconds / 60;
        if (interval > 1) return `${Math.floor(interval)}m`;
        return 'now';
    };

    return (
        <>
            {/* Bell Icon */}
            <button
                onClick={handleOpenNotifications}
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

            {/* Notifications Panel - Instagram Style */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center sm:justify-center animate-fade-in"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-background dark:bg-dark-background w-full sm:max-w-md sm:rounded-2xl max-h-[85vh] sm:max-h-[600px] flex flex-col overflow-hidden animate-slide-in-up shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Instagram Style */}
                        <div className="px-4 py-3 border-b border-border-color dark:border-dark-border-color flex items-center justify-between bg-background dark:bg-dark-background sticky top-0 z-10">
                            <h2 className="text-base font-semibold text-primary-text dark:text-dark-primary-text">
                                Notifications
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-secondary-text dark:text-dark-secondary-text hover:text-primary-text p-1 transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Mark all read button */}
                        {unreadCount > 0 && (
                            <div className="px-4 py-2 border-b border-border-color dark:border-dark-border-color">
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-sm text-accent-primary hover:text-accent-secondary font-semibold transition-colors"
                                >
                                    Mark all as read
                                </button>
                            </div>
                        )}

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto no-scrollbar bg-background dark:bg-dark-background">
                            {loading ? (
                                <div className="flex justify-center items-center h-40">
                                    <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-60 px-8 text-center">
                                    <BellIcon className="w-16 h-16 mb-4 opacity-20 text-secondary-text" />
                                    <p className="text-base font-semibold text-primary-text dark:text-dark-primary-text mb-1">
                                        No notifications yet
                                    </p>
                                    <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
                                        When someone likes or comments on your posts, you'll see it here.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    {notifications.map((notif, index) => (
                                        <div
                                            key={notif.id}
                                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-200 cursor-pointer border-b border-border-color/30 dark:border-dark-border-color/30 ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                                }`}
                                            style={{
                                                animationDelay: `${index * 30}ms`
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Avatar - Instagram Style */}
                                                <div className="relative flex-shrink-0">
                                                    <div
                                                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-base overflow-hidden"
                                                        style={{
                                                            backgroundColor: notif.actor_avatar
                                                                ? 'transparent'
                                                                : '#667eea'
                                                        }}
                                                    >
                                                        {notif.actor_avatar ? (
                                                            <img
                                                                src={notif.actor_avatar}
                                                                alt={notif.actor_name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            (notif.actor_name || 'A').charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    {!notif.read && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-primary rounded-full border-2 border-background dark:border-dark-background"></div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-primary-text dark:text-dark-primary-text leading-tight">
                                                        <span className="font-semibold">{notif.actor_name || 'Someone'}</span>
                                                        {' '}
                                                        <span className="text-secondary-text dark:text-dark-secondary-text">
                                                            {getNotificationText(notif)}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-secondary-text dark:text-dark-secondary-text mt-1">
                                                        {timeAgo(notif.created_at)}
                                                    </p>
                                                </div>

                                                {/* Type indicator icon */}
                                                {notif.type === 'like' && (
                                                    <div className="flex-shrink-0">
                                                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                                {notif.type === 'comment' && (
                                                    <div className="flex-shrink-0">
                                                        <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationBell;
