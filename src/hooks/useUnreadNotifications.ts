import { useState, useEffect } from 'react';
import { useNotificationsRealtime } from './useFirebaseRealtime';
import * as notificationService from '../../services/notificationService';

export const useUnreadNotifications = (userId: string | undefined) => {
    const [unreadCount, setUnreadCount] = useState(0);

    // Initial fetch
    useEffect(() => {
        const fetchCount = async () => {
            if (userId) {
                const count = await notificationService.getUnreadCount(userId);
                setUnreadCount(count);
            }
        };
        fetchCount();
    }, [userId]);

    // Realtime updates
    useNotificationsRealtime({
        userId: userId || '',
        onNewNotification: () => {
            setUnreadCount(prev => prev + 1);
        },
        onUpdated: (id, read) => {
            if (read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        },
        enabled: !!userId
    });

    return unreadCount;
};
