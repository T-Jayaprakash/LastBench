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
import { BellIcon, XMarkIcon, HeartIcon, ArrowLeftIcon } from './Icons';
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
            {/* Heart Icon (Trigger) */}
            <button
                onClick={handleOpenNotifications}
                className="relative p-2 text-white hover:opacity-70 transition-opacity active:scale-95"
                aria-label="Notifications"
            >
                <HeartIcon className="w-[28px] h-[28px] stroke-[1.8px] fill-transparent" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-1.5 w-[9px] h-[9px] bg-[#FF3040] rounded-full border border-black"></span>
                )}
            </button>

            {/* Notifications Screen - Full Page Overlay (Instagram Style) */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black flex flex-col animate-slide-in-right"
                >
                    {/* Header - Minimal & Exact */}
                    <div className="flex items-center h-[44px] px-4 border-b border-white/10 bg-black sticky top-0 z-10">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 -ml-2 text-white hover:opacity-70 transition-opacity"
                        >
                            <ArrowLeftIcon className="w-6 h-6 stroke-[2px]" />
                        </button>
                        <h1 className="flex-1 text-center text-white font-bold text-[16px]">Notifications</h1>
                        <div className="w-8"></div> {/* Spacer balance */}
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto no-scrollbar bg-black">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] px-10 text-center">
                                <div className="w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center mb-4">
                                    <HeartIcon className="w-10 h-10 text-white/20 stroke-[1px]" />
                                </div>
                                <p className="text-[20px] font-bold text-white mb-2">Activity On Your Posts</p>
                                <p className="text-[14px] text-gray-400">
                                    When someone likes or comments on your confessions, you'll see them here.
                                </p>
                            </div>
                        ) : (
                            <div className="py-2">
                                {/* New / This Week headers are banned per request ("Do NOT add grouping headers") */}
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className="flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        {/* Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <div
                                                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-xs overflow-hidden ring-1 ring-white/10 bg-[#262626]"
                                            >
                                                {notif.actor_avatar ? (
                                                    <img
                                                        src={notif.actor_avatar}
                                                        alt="User"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (notif.actor_name || 'A').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            {!notif.read && (
                                                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#0095F6] rounded-full border-2 border-black"></div>
                                            )}
                                        </div>

                                        {/* Text Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] text-white leading-snug">
                                                <span className="font-semibold mr-1">{notif.actor_name || 'Someone'}</span>
                                                <span className="text-white font-normal">
                                                    {notif.type === 'like' && 'liked your post.'}
                                                    {notif.type === 'comment' && `commented: ${notif.content?.substring(0, 50) || 'nice'}`}
                                                    {notif.type === 'reply' && 'replied to your comment.'}
                                                    {notif.type === 'mention' && 'mentioned you.'}
                                                </span>
                                                <span className="text-gray-500 text-[12px] ml-1.5 whitespace-nowrap">
                                                    {timeAgo(notif.created_at).replace('d', 'd').replace('h', 'h').replace('m', 'm')}
                                                </span>
                                            </p>
                                        </div>

                                        {/* End Action / Media Preview */}
                                        {notif.post_image && (
                                            <div className="w-11 h-11 bg-gray-800 rounded ml-2 overflow-hidden flex-shrink-0">
                                                <img src={notif.post_image} className="w-full h-full object-cover opacity-80" alt="Post" />
                                            </div>
                                        )}
                                        {/* If no image, maybe show a small follow button or nothing. Keeping it clean as requested. */}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationBell;
