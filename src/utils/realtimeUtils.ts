/**
 * ============================================================================
 * REALTIME UTILITIES - Firebase Compatible
 * ============================================================================
 * 
 * Utility functions for handling realtime data changes
 * Updated for Firebase Firestore compatibility
 * 
 * ============================================================================
 */

import { DocumentData } from 'firebase/firestore';

/**
 * Firestore change types
 */
export type FirestoreChangeType = 'added' | 'modified' | 'removed';

/**
 * Firestore change payload (compatible with our hooks)
 */
export interface FirestoreChangePayload {
    type: FirestoreChangeType;
    doc: {
        id: string;
        data: DocumentData;
    };
}

/**
 * Legacy compatibility type (matches old Supabase format)
 */
export interface RealtimePayload<T = any> {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T;
    old?: T;
}

/**
 * Merge a new item into an array, avoiding duplicates
 * Useful for realtime INSERT events
 */
export function mergeRealtimeInsert<T extends { id: string }>(
    currentList: T[],
    newItem: T,
    prepend: boolean = true
): T[] {
    // Check for duplicates
    if (currentList.some(item => item.id === newItem.id)) {
        return currentList;
    }

    return prepend ? [newItem, ...currentList] : [...currentList, newItem];
}

/**
 * Update an item in an array based on ID
 * Useful for realtime UPDATE events
 */
export function mergeRealtimeUpdate<T extends { id: string }>(
    currentList: T[],
    updatedItem: Partial<T> & { id: string }
): T[] {
    return currentList.map(item =>
        item.id === updatedItem.id
            ? { ...item, ...updatedItem }
            : item
    );
}

/**
 * Remove an item from an array based on ID
 * Useful for realtime DELETE events
 */
export function mergeRealtimeDelete<T extends { id: string }>(
    currentList: T[],
    deletedId: string
): T[] {
    return currentList.filter(item => item.id !== deletedId);
}

/**
 * Convert Firestore change type to legacy format
 */
export function mapChangeTypeToLegacy(type: FirestoreChangeType): 'INSERT' | 'UPDATE' | 'DELETE' {
    switch (type) {
        case 'added': return 'INSERT';
        case 'modified': return 'UPDATE';
        case 'removed': return 'DELETE';
        default: return 'UPDATE';
    }
}

/**
 * Generic handler for realtime changes
 * Automatically merges, updates, or deletes based on event type
 */
export function handleRealtimeChange<T extends { id: string }>(
    currentList: T[],
    type: FirestoreChangeType,
    data: T
): T[] {
    switch (type) {
        case 'added':
            return mergeRealtimeInsert(currentList, data);
        case 'modified':
            return mergeRealtimeUpdate(currentList, data);
        case 'removed':
            return mergeRealtimeDelete(currentList, data.id);
        default:
            return currentList;
    }
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return ((...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number
): T {
    let inThrottle = false;

    return ((...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }) as T;
}
