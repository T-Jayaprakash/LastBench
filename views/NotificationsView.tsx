/**
 * ============================================================================
 * NOTIFICATIONS VIEW - Instagram Style
 * ============================================================================
 * 
 * Clean notifications screen like Instagram - no headers, minimal UI
 * Uses Firebase Firestore for real-time notifications
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
    onNotificationClick?: (postId: string) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ userId, onBack, onNotificationClick }) => {
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

    const handleNotificationClick = (notif: NotificationWithPost) => {
        if (notif.post_id && onNotificationClick) {
            onNotificationClick(notif.post_id);
        }
    };

    const getNotificationText = (notif: NotificationWithPost): React.ReactNode => {
        switch (notif.type) {
            case 'like':
                return <span className="text-white/70">liked your post</span>;
            case 'comment':
                return (
                    <>
                        <span className="text-white/70">commented: </span>
                        <span className="text-white/50">{notif.content?.substring(0, 40)}{notif.content && notif.content.length > 40 ? '...' : ''}</span>
                    </>
                );
            case 'reply':
                return <span className="text-white/70">replied to your comment</span>;
            case 'mention':
                return <span className="text-white/70">mentioned you</span>;
            default:
                return <span className="text-white/70">sent you a notification</span>;
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

    // Group notifications by time periods (Today, This Week, Earlier)
    const groupNotifications = (notifs: NotificationWithPost[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const groups: { label: string; notifications: NotificationWithPost[] }[] = [
            { label: 'Today', notifications: [] },
            { label: 'This Week', notifications: [] },
            { label: 'This Month', notifications: [] },
            { label: 'Earlier', notifications: [] },
        ];

        notifs.forEach(notif => {
            const notifDate = new Date(notif.created_at);
            if (notifDate >= today) {
                groups[0].notifications.push(notif);
            } else if (notifDate >= thisWeek) {
                groups[1].notifications.push(notif);
            } else if (notifDate >= thisMonth) {
                groups[2].notifications.push(notif);
            } else {
                groups[3].notifications.push(notif);
            }
        });

        return groups.filter(g => g.notifications.length > 0);
    };

    const groupedNotifications = groupNotifications(notifications);

    return (
        <div className="h-full flex flex-col bg-black pb-16">
            {/* Pull to Refresh Indicator */}
            {refreshing && (
                <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
            )}

            {/* Notifications List - Instagram Style */}
            <div
                className="flex-1 overflow-y-auto no-scrollbar"
                onTouchStart={(e) => {
                    const touch = e.touches[0];
                    (e.currentTarget as any).startY = touch.clientY;
                }}
                onTouchEnd={(e) => {
                    const target = e.currentTarget as any;
                    if (target.scrollTop === 0 && target.startY && target.startY > 100) {
                        handleRefresh();
                    }
                }}
            >
                {loading ? (
                    <div className="flex justify-center items-center h-60">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
                        <div className="w-24 h-24 rounded-full border-2 border-white/10 flex items-center justify-center mb-6">
                            <BellIcon className="w-12 h-12 text-white/20" />
                        </div>
                        <p className="text-xl font-semibold text-white mb-2">
                            Activity On Your Posts
                        </p>
                        <p className="text-sm text-white/50">
                            When someone likes or comments on one of your posts, you'll see it here.
                        </p>
                    </div>
                ) : (
                    <div>
                        {groupedNotifications.map((group) => (
                            <div key={group.label}>
                                {/* Section Header */}
                                <div className="px-4 py-3 bg-black sticky top-0 z-10">
                                    <h3 className="text-white font-bold text-[15px]">{group.label}</h3>
                                </div>

                                {/* Notifications in Group */}
                                {group.notifications.map((notif) => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`w-full px-4 py-3 flex items-center gap-3 active:bg-white/5 transition-colors ${!notif.read ? 'bg-[#0095f6]/5' : ''
                                            }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div
                                                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                                                style={{
                                                    backgroundColor: notif.actor_avatar ? 'transparent' : '#262626'
                                                }}
                                            >
                                                {notif.actor_avatar ? (
                                                    <img
                                                        src={notif.actor_avatar}
                                                        alt={notif.actor_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-sm">
                                                        {(notif.actor_name || 'A').charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Notification Type Icon */}
                                            {notif.type === 'like' && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#ff3040] rounded-full flex items-center justify-center border-2 border-black">
                                                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                            {notif.type === 'comment' && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-black">
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="text-[14px] leading-tight">
                                                <span className="font-semibold text-white">{notif.actor_name || 'Someone'}</span>
                                                {' '}
                                                {getNotificationText(notif)}
                                                {' '}
                                                <span className="text-white/40">{timeAgo(notif.created_at)}</span>
                                            </p>
                                        </div>

                                        {/* Follow Button (for follow notifications) or Post Thumbnail */}
                                        {notif.type === 'like' || notif.type === 'comment' ? (
                                            <div className="w-11 h-11 rounded bg-[#262626] flex-shrink-0 overflow-hidden">
                                                {/* Post thumbnail placeholder */}
                                                <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                                                    📝
                                                </div>
                                            </div>
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsView;
