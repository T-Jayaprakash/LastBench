/**
 * ============================================================================
 * FIREBASE REALTIME HOOKS
 * ============================================================================
 * 
 * React hooks for subscribing to Firebase Firestore real-time updates
 * Replaces Supabase Realtime functionality
 * 
 * Features:
 * - Collection and document subscriptions
 * - Automatic cleanup on unmount
 * - Debounce support for high-frequency updates
 * - Error handling and reconnection
 * 
 * ============================================================================
 */

import { useEffect, useRef, useCallback } from 'react';
import {
    collection,
    doc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Query,
    DocumentData,
    QueryConstraint,
    Unsubscribe,
    DocumentReference
} from 'firebase/firestore';
import { db } from '../../services/firebase';

// ============================================================================
// TYPES
// ============================================================================

export type FirestoreChangeType = 'added' | 'modified' | 'removed';

export interface FirestoreChange<T = DocumentData> {
    type: FirestoreChangeType;
    doc: {
        id: string;
        data: T;
    };
}

export interface RealtimeOptions {
    /** Enable/disable the subscription */
    enabled?: boolean;
    /** Debounce callback execution (ms) */
    debounceMilliseconds?: number;
}

export interface CollectionSubscriptionOptions extends RealtimeOptions {
    /** Firestore collection name */
    collectionName: string;
    /** Query constraints (where, orderBy, limit, etc) */
    constraints?: QueryConstraint[];
    /** Callback when changes occur */
    onChange: (changes: FirestoreChange[]) => void;
    /** Optional callback for errors */
    onError?: (error: Error) => void;
}

export interface DocumentSubscriptionOptions extends RealtimeOptions {
    /** Firestore collection name */
    collectionName: string;
    /** Document ID to subscribe to */
    documentId: string;
    /** Callback when document changes */
    onChange: (data: DocumentData | null, exists: boolean) => void;
    /** Optional callback for errors */
    onError?: (error: Error) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce function for high-frequency updates
 */
function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return ((...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}

// ============================================================================
// COLLECTION SUBSCRIPTION HOOK
// ============================================================================

/**
 * Hook for subscribing to a Firestore collection with optional filtering
 * 
 * @example
 * ```tsx
 * useFirestoreCollection({
 *   collectionName: 'posts',
 *   constraints: [
 *     where('college', '==', userCollege),
 *     orderBy('created_at', 'desc'),
 *     limit(20)
 *   ],
 *   onChange: (changes) => {
 *     changes.forEach(change => {
 *       if (change.type === 'added') {
 *         // Handle new document
 *       }
 *     });
 *   }
 * });
 * ```
 */
export function useFirestoreCollection(options: CollectionSubscriptionOptions): void {
    const {
        collectionName,
        constraints = [],
        onChange,
        onError,
        enabled = true,
        debounceMilliseconds = 0,
    } = options;

    const callbackRef = useRef(onChange);
    const unsubscribeRef = useRef<Unsubscribe | null>(null);

    // Keep callback ref updated
    useEffect(() => {
        callbackRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!enabled) {
            // Cleanup existing subscription if disabled
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            return;
        }

        const collectionRef = collection(db, collectionName);
        const q = constraints.length > 0
            ? query(collectionRef, ...constraints)
            : query(collectionRef);

        const callback = debounceMilliseconds > 0
            ? debounce(callbackRef.current, debounceMilliseconds)
            : callbackRef.current;

        unsubscribeRef.current = onSnapshot(
            q,
            (snapshot) => {
                const changes: FirestoreChange[] = snapshot.docChanges().map(change => ({
                    type: change.type,
                    doc: {
                        id: change.doc.id,
                        data: change.doc.data(),
                    },
                }));

                if (changes.length > 0) {
                    callback(changes);
                }
            },
            (error) => {
                console.error(`[Firestore] Collection subscription error (${collectionName}):`, error);
                onError?.(error);
            }
        );

        console.log(`[Firestore] ✅ Subscribed to collection: ${collectionName}`);

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
                console.log(`[Firestore] 🔌 Unsubscribed from collection: ${collectionName}`);
            }
        };
    }, [collectionName, JSON.stringify(constraints), enabled, debounceMilliseconds]);
}

// ============================================================================
// DOCUMENT SUBSCRIPTION HOOK
// ============================================================================

/**
 * Hook for subscribing to a single Firestore document
 * 
 * @example
 * ```tsx
 * useFirestoreDocument({
 *   collectionName: 'posts',
 *   documentId: postId,
 *   onChange: (data, exists) => {
 *     if (exists) {
 *       setLikesCount(data.likes_count);
 *     }
 *   }
 * });
 * ```
 */
export function useFirestoreDocument(options: DocumentSubscriptionOptions): void {
    const {
        collectionName,
        documentId,
        onChange,
        onError,
        enabled = true,
        debounceMilliseconds = 0,
    } = options;

    const callbackRef = useRef(onChange);
    const unsubscribeRef = useRef<Unsubscribe | null>(null);

    useEffect(() => {
        callbackRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!enabled || !documentId) {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            return;
        }

        const docRef = doc(db, collectionName, documentId);

        const callback = debounceMilliseconds > 0
            ? debounce(callbackRef.current, debounceMilliseconds)
            : callbackRef.current;

        unsubscribeRef.current = onSnapshot(
            docRef,
            (snapshot) => {
                callback(snapshot.exists() ? snapshot.data() : null, snapshot.exists());
            },
            (error) => {
                console.error(`[Firestore] Document subscription error (${collectionName}/${documentId}):`, error);
                onError?.(error);
            }
        );

        console.log(`[Firestore] ✅ Subscribed to document: ${collectionName}/${documentId}`);

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
                console.log(`[Firestore] 🔌 Unsubscribed from document: ${collectionName}/${documentId}`);
            }
        };
    }, [collectionName, documentId, enabled, debounceMilliseconds]);
}

// ============================================================================
// NOTIFICATIONS REALTIME HOOK (Convenience wrapper)
// ============================================================================

interface NotificationRealtimeOptions {
    userId: string;
    onNewNotification: (notification: any) => void;
    onUpdated?: (notificationId: string, read: boolean) => void;
    enabled?: boolean;
}

/**
 * Convenience hook for subscribing to user notifications
 */
export function useNotificationsRealtime(options: NotificationRealtimeOptions): void {
    const { userId, onNewNotification, onUpdated, enabled = true } = options;

    useFirestoreCollection({
        collectionName: 'notifications',
        constraints: [
            where('user_id', '==', userId),
            orderBy('created_at', 'desc'),
            limit(50),
        ],
        onChange: (changes) => {
            changes.forEach(change => {
                if (change.type === 'added' && !change.doc.data.read) {
                    onNewNotification({
                        id: change.doc.id,
                        ...change.doc.data,
                        created_at: change.doc.data.created_at?.toDate?.() || new Date(),
                    });
                }

                if (change.type === 'modified' && onUpdated) {
                    onUpdated(change.doc.id, change.doc.data.read);
                }
            });
        },
        enabled: enabled && !!userId,
        debounceMilliseconds: 100,
    });
}

// ============================================================================
// FEED REALTIME HOOK (Convenience wrapper)
// ============================================================================

interface FeedRealtimeOptions {
    college: string;
    onNewPost: (post: any) => void;
    enabled?: boolean;
}

/**
 * Convenience hook for subscribing to new posts in a college feed
 */
export function useFeedRealtime(options: FeedRealtimeOptions): void {
    const { college, onNewPost, enabled = true } = options;

    useFirestoreCollection({
        collectionName: 'posts',
        constraints: [
            where('college', '==', college),
            orderBy('created_at', 'desc'),
            limit(1),
        ],
        onChange: (changes) => {
            changes.forEach(change => {
                if (change.type === 'added') {
                    onNewPost({
                        id: change.doc.id,
                        ...change.doc.data,
                        createdAt: change.doc.data.created_at?.toDate?.() || new Date(),
                    });
                }
            });
        },
        enabled: enabled && !!college,
    });
}

// ============================================================================
// BACKWARD COMPATIBILITY - Supabase-like interface
// ============================================================================

/**
 * @deprecated Use useFirestoreCollection or useNotificationsRealtime instead
 * This is kept for backward compatibility during migration
 */
export function useSupabaseRealtimeFiltered(options: {
    table: string;
    filter?: string;
    callback: (payload: any) => void;
    events?: string[];
    debounceMilliseconds?: number;
}): void {
    const { table, filter, callback, debounceMilliseconds = 0 } = options;

    // Parse filter (format: "field=eq.value")
    const constraints: QueryConstraint[] = [];
    if (filter) {
        const match = filter.match(/(\w+)=eq\.(.+)/);
        if (match) {
            constraints.push(where(match[1], '==', match[2]));
        }
    }
    constraints.push(orderBy('created_at', 'desc'));
    constraints.push(limit(50));

    useFirestoreCollection({
        collectionName: table,
        constraints,
        onChange: (changes) => {
            changes.forEach(change => {
                let eventType: string;
                switch (change.type) {
                    case 'added': eventType = 'INSERT'; break;
                    case 'modified': eventType = 'UPDATE'; break;
                    case 'removed': eventType = 'DELETE'; break;
                    default: eventType = change.type;
                }

                callback({
                    eventType,
                    new: change.doc.data,
                    old: null, // Firestore doesn't provide old data for updates
                });
            });
        },
        debounceMilliseconds,
    });
}

/**
 * @deprecated Use useFirestoreCollection instead
 */
export function useSupabaseRealtime(
    tableName: string,
    callback: (payload: any) => void,
    opts: RealtimeOptions = {}
): null {
    useFirestoreCollection({
        collectionName: tableName,
        onChange: (changes) => {
            changes.forEach(change => {
                callback({
                    eventType: change.type.toUpperCase(),
                    new: change.doc.data,
                });
            });
        },
        ...opts,
    });

    return null;
}
