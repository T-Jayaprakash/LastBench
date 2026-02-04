/**
 * ============================================================================
 * NOTIFICATIONS VIEW
 * ============================================================================
 * 
 * Full-page notifications screen with real-time updates
 * Uses Firebase Firestore for notifications
 * 
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { NotificationWithPost } from '../types/notifications';
import { BellIcon, ArrowPathIcon } from '../components/Icons';
import * as notificationService from '../services/notificationService';
import { useNotificationsRealtime } from '../src/hooks/useFirebaseRealtime';

interface NotificationsViewProps {
    userId: string;
    onBack: () => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ userId, onBack }) => {
    const [notifications, setNotifications] = useState<NotificationWithPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch notifications
    const fetchNotifications = async () => {
        setLoading(true);
        const notifs = await notificationService.getNotifications(userId, 100);
        setNotifications(notifs);
        setLoading(false);
    };

    useEffect(() => {
        if (userId) {
            fetchNotifications();
            // Automatically mark all as read when opening the page
            handleMarkAllRead();
        }
    }, [userId]);

    // Subscribe to new notifications in realtime using Firebase
    useNotificationsRealtime({
        userId,
        onNewNotification: (notification) => {
            // Refresh to get full notification data with profile
            fetchNotifications();
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        },
        onUpdated: (notificationId, read) => {
            // Update existing notification
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read } : n)
            );
        },
        enabled: !!userId,
    });

    const handleMarkAllRead = async () => {
        const success = await notificationService.markAllNotificationsRead(userId);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
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

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="h-full flex flex-col bg-background dark:bg-dark-background">
            {/* Header */}
            <header className="flex-shrink-0 bg-background dark:bg-dark-background border-b border-border-color dark:border-dark-border-color px-4 py-3 pt-12 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 -ml-2 text-primary-text dark:text-dark-primary-text active:scale-95 transition-transform"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-primary-text dark:text-dark-primary-text">Notifications</h1>
                        {unreadCount > 0 && (
                            <p className="text-xs text-secondary-text dark:text-dark-secondary-text">
                                {unreadCount} unread
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-sm text-accent-primary hover:text-accent-secondary font-semibold transition-colors px-3 py-1"
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 text-secondary-text dark:text-dark-secondary-text hover:text-primary-text active:scale-95 transition-transform disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="flex justify-center items-center h-60">
                        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                        <BellIcon className="w-20 h-20 mb-4 opacity-20 text-secondary-text" />
                        <p className="text-lg font-semibold text-primary-text dark:text-dark-primary-text mb-2">
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
                                className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-200 border-b border-border-color/30 dark:border-dark-border-color/30 ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                                            style={{
                                                backgroundColor: notif.actor_avatar ? 'transparent' : '#667eea'
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
                                            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                    {notif.type === 'comment' && (
                                        <div className="flex-shrink-0">
                                            <svg className="w-6 h-6 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    );
};

export default NotificationsView;
