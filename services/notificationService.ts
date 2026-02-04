/**
 * ============================================================================
 * NOTIFICATION SERVICE - Firebase Firestore Implementation
 * ============================================================================
 * 
 * Handles notification CRUD operations using Firestore
 * Designed for production Play Store release
 * 
 * ============================================================================
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    writeBatch,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Notification, NotificationWithPost } from '../types/notifications';

const COLLECTION_NAME = 'notifications';

// ============================================================================
// NOTIFICATION QUERIES
// ============================================================================

/**
 * Fetch notifications for a user with post and actor details
 */
export async function getNotifications(userId: string, limitCount: number = 50): Promise<NotificationWithPost[]> {
    try {
        const notificationsRef = collection(db, COLLECTION_NAME);
        const q = query(
            notificationsRef,
            where('user_id', '==', userId),
            orderBy('created_at', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const notifications: NotificationWithPost[] = [];

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            let postText: string | undefined;
            let postImage: string | undefined;
            let actorName = data.actor_name || 'Someone';
            let actorAvatar = data.actor_avatar;

            // Fetch post details if post_id exists
            if (data.post_id) {
                try {
                    const postRef = doc(db, 'posts', data.post_id);
                    const postSnap = await getDoc(postRef);
                    if (postSnap.exists()) {
                        const postData = postSnap.data();
                        postText = postData.text;
                        postImage = postData.image_url;
                    }
                } catch (e) {
                    console.warn('Failed to fetch post for notification:', e);
                }
            }

            // Fetch actor details if actor_id exists and name isn't populated
            if (data.actor_id && !data.actor_name) {
                try {
                    const actorRef = doc(db, 'profiles', data.actor_id);
                    const actorSnap = await getDoc(actorRef);
                    if (actorSnap.exists()) {
                        const actorData = actorSnap.data();
                        actorName = actorData.display_name || 'Someone';
                        actorAvatar = actorData.avatar_url;
                    }
                } catch (e) {
                    console.warn('Failed to fetch actor for notification:', e);
                }
            }

            notifications.push({
                id: docSnap.id,
                user_id: data.user_id,
                type: data.type,
                post_id: data.post_id,
                comment_id: data.comment_id,
                actor_id: data.actor_id,
                actor_name: actorName,
                actor_avatar: actorAvatar,
                content: data.content,
                read: data.read || false,
                created_at: data.created_at?.toDate?.() || new Date(data.created_at),
                post_text: postText,
                post_image: postImage,
            });
        }

        return notifications;
    } catch (err) {
        console.error('Error fetching notifications:', err);
        return [];
    }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
    try {
        const notifRef = doc(db, COLLECTION_NAME, notificationId);
        await updateDoc(notifRef, { read: true });
        return true;
    } catch (err) {
        console.error('Error marking notification as read:', err);
        return false;
    }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
    try {
        const notificationsRef = collection(db, COLLECTION_NAME);
        const q = query(
            notificationsRef,
            where('user_id', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return true;

        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
            batch.update(docSnap.ref, { read: true });
        });

        await batch.commit();
        console.log(`✅ Marked ${snapshot.size} notifications as read`);
        return true;
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        return false;
    }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
    try {
        const notificationsRef = collection(db, COLLECTION_NAME);
        const q = query(
            notificationsRef,
            where('user_id', '==', userId),
            where('read', '==', false)
        );

        const snapshot = await getDocs(q);
        return snapshot.size;
    } catch (err) {
        console.error('Error getting unread count:', err);
        return 0;
    }
}

/**
 * Create a notification
 */
export async function createNotification(
    notification: Omit<Notification, 'id' | 'created_at'>
): Promise<boolean> {
    try {
        const notificationsRef = collection(db, COLLECTION_NAME);
        await addDoc(notificationsRef, {
            ...notification,
            read: false,
            created_at: serverTimestamp(),
        });
        return true;
    } catch (err) {
        console.error('Error creating notification:', err);
        return false;
    }
}

/**
 * Delete old notifications (cleanup function)
 */
export async function deleteOldNotifications(userId: string, daysOld: number = 30): Promise<boolean> {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

        const notificationsRef = collection(db, COLLECTION_NAME);
        const q = query(
            notificationsRef,
            where('user_id', '==', userId),
            where('created_at', '<', cutoffTimestamp)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return true;

        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });

        await batch.commit();
        console.log(`✅ Deleted ${snapshot.size} old notifications`);
        return true;
    } catch (err) {
        console.error('Error deleting old notifications:', err);
        return false;
    }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

import { onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';

/**
 * Subscribe to new notifications for a user (realtime)
 */
export function subscribeToNotifications(
    userId: string,
    onNew: (notification: NotificationWithPost) => void,
    onUpdate?: (notificationId: string, read: boolean) => void
): () => void {
    const notificationsRef = collection(db, COLLECTION_NAME);
    const q = query(
        notificationsRef,
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        snapshot.docChanges().forEach(change => {
            const data = change.doc.data();

            if (change.type === 'added' && !data.read) {
                // New notification
                const notification: NotificationWithPost = {
                    id: change.doc.id,
                    user_id: data.user_id,
                    type: data.type,
                    post_id: data.post_id,
                    comment_id: data.comment_id,
                    actor_id: data.actor_id,
                    actor_name: data.actor_name || 'Someone',
                    actor_avatar: data.actor_avatar,
                    content: data.content,
                    read: data.read || false,
                    created_at: data.created_at?.toDate?.() || new Date(),
                };
                onNew(notification);
            }

            if (change.type === 'modified' && onUpdate) {
                onUpdate(change.doc.id, data.read);
            }
        });
    }, (error) => {
        console.error('Notifications subscription error:', error);
    });
}
