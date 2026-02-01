/**
 * ============================================================================
 * PRODUCTION-GRADE FCM CLIENT SERVICE
 * ============================================================================
 * 
 * Purpose: Handle FCM token registration, notification reception, and deep linking
 * 
 * Features:
 * - Multi-platform support (Android, iOS, Web)
 * - Automatic token refresh handling
 * - Foreground, background, and terminated state handling
 * - Deep linking to specific screens
 * - Notification permission management
 * - Token synchronization with backend
 * - Comprehensive error handling
 * 
 * Architecture:
 * 1. Request notification permissions
 * 2. Register for FCM and get token
 * 3. Save token to Supabase (fcm_tokens table)
 * 4. Listen for token refresh events
 * 5. Handle incoming notifications (foreground/background/terminated)
 * 6. Navigate to appropriate screen based on notification data
 * 
 * ============================================================================
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';
import { getCurrentUser } from './userService';

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationData {
    notificationId: string;
    type: 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'system';
    postId?: string;
    commentId?: string;
    actorUserId?: string;
    timestamp: string;
    isBatched: string;
    batchCount: string;
}

export interface FCMToken {
    id?: string;
    user_id: string;
    token: string;
    device_id?: string;
    platform: 'android' | 'ios' | 'web';
    app_version?: string;
    is_active: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // Get device ID from device info or generate a unique ID
    getDeviceId: (): string => {
        const stored = localStorage.getItem('fcm_device_id');
        if (stored) return stored;

        const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('fcm_device_id', newId);
        return newId;
    },

    // Get app version from package.json or environment
    getAppVersion: (): string => {
        return process.env.VITE_APP_VERSION || '2.10.6';
    },
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const log = {
    info: (...args: any[]) => console.log('[FCM]', ...args),
    success: (...args: any[]) => console.log('[FCM] ✅', ...args),
    warning: (...args: any[]) => console.warn('[FCM] ⚠️', ...args),
    error: (...args: any[]) => console.error('[FCM] ❌', ...args),
    debug: (...args: any[]) => {
        if (process.env.NODE_ENV === 'development') {
            console.log('[FCM] 🐛', ...args);
        }
    },
};

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Save FCM token to Supabase
 * WHY: Backend needs tokens to send push notifications
 */
async function saveFCMToken(token: string, platform: 'android' | 'ios' | 'web'): Promise<boolean> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            log.warning('Cannot save FCM token: User not logged in');
            return false;
        }

        const tokenData: Partial<FCMToken> = {
            user_id: user.userId,
            token: token,
            device_id: CONFIG.getDeviceId(),
            platform: platform,
            app_version: CONFIG.getAppVersion(),
            is_active: true,
        };

        const { error } = await supabase
            .from('fcm_tokens')
            .upsert(tokenData, {
                onConflict: 'user_id,token',
            });

        if (error) {
            log.error('Failed to save FCM token:', error);
            return false;
        }

        log.success(`FCM token saved successfully (${platform})`);
        return true;
    } catch (error) {
        log.error('Exception saving FCM token:', error);
        return false;
    }
}

/**
 * Remove FCM token from Supabase
 * WHY: Clean up when user logs out or uninstalls app
 */
async function removeFCMToken(token: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('fcm_tokens')
            .update({ is_active: false })
            .eq('token', token);

        if (error) {
            log.error('Failed to remove FCM token:', error);
        } else {
            log.info('FCM token removed successfully');
        }
    } catch (error) {
        log.error('Exception removing FCM token:', error);
    }
}

// ============================================================================
// DEEP LINKING / NAVIGATION
// ============================================================================

/**
 * Navigate to appropriate screen based on notification data
 * WHY: Instagram-like behavior - tap notification to view related content
 * 
 * NOTE: You'll need to integrate this with your navigation system
 * (React Router, or your custom navigation)
 */
export function handleNotificationNavigation(data: NotificationData): void {
    log.info('Handling notification navigation:', data);

    try {
        const { type, postId, commentId, actorUserId } = data;

        // Build the navigation path based on notification type
        let path = '/';

        switch (type) {
            case 'like':
            case 'comment':
                if (postId) {
                    path = `/post/${postId}`;
                    if (commentId) {
                        path += `?commentId=${commentId}`;
                    }
                }
                break;

            case 'reply':
                if (postId && commentId) {
                    path = `/post/${postId}?commentId=${commentId}`;
                }
                break;

            case 'follow':
                if (actorUserId) {
                    path = `/profile/${actorUserId}`;
                }
                break;

            case 'mention':
                if (postId) {
                    path = `/post/${postId}`;
                }
                break;

            default:
                path = '/notifications';
        }

        log.debug('Navigating to:', path);

        // IMPORTANT: Replace this with your actual navigation method
        // Examples:
        // - React Router: navigate(path)
        // - Window location: window.location.href = path
        // - Custom navigation: yourNavigationService.navigate(path)

        // For now, using window location as fallback
        if (typeof window !== 'undefined') {
            window.location.href = path;
        }

        // TODO: Integrate with your app's navigation system
        // Example for React Router:
        // import { useNavigate } from 'react-router-dom';
        // const navigate = useNavigate();
        // navigate(path);

    } catch (error) {
        log.error('Navigation error:', error);
        // Fallback to notifications page
        if (typeof window !== 'undefined') {
            window.location.href = '/notifications';
        }
    }
}

/**
 * Mark notification as read
 * WHY: Update UI to show notification was viewed
 */
async function markNotificationAsRead(notificationId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) {
            log.error('Failed to mark notification as read:', error);
        }
    } catch (error) {
        log.error('Exception marking notification as read:', error);
    }
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

/**
 * Handle notification received in foreground
 * WHY: Show in-app notification or update UI when app is open
 */
function handleForegroundNotification(notification: PushNotificationSchema): void {
    log.info('Foreground notification received:', notification);

    // Extract notification data
    const data = notification.data as unknown as NotificationData;

    // Show in-app notification (you can customize this)
    // Example: Show a toast, banner, or update notification bell
    if (typeof window !== 'undefined' && 'Notification' in window) {
        // You can show a custom in-app notification here
        // Or dispatch an event to update your notification bell
        const event = new CustomEvent('fcm-notification', {
            detail: { notification, data },
        });
        window.dispatchEvent(event);
    }

    log.debug('Foreground notification data:', data);
}

/**
 * Handle notification tap (when user clicks on notification)
 * WHY: Navigate to relevant content when notification is tapped
 */
function handleNotificationTap(action: ActionPerformed): void {
    log.info('Notification tapped:', action);

    const data = action.notification.data as unknown as NotificationData;

    // Mark as read
    if (data.notificationId) {
        markNotificationAsRead(data.notificationId);
    }

    // Navigate to appropriate screen
    handleNotificationNavigation(data);
}

// ============================================================================
// NATIVE PUSH NOTIFICATIONS (Android/iOS)
// ============================================================================

/**
 * Initialize native push notifications (Android/iOS)
 * WHY: Capacitor provides native FCM integration for mobile apps
 */
async function initializeNativePush(): Promise<boolean> {
    try {
        log.info('Initializing native push notifications...');

        // Request permissions
        const permResult = await PushNotifications.requestPermissions();

        if (permResult.receive === 'granted') {
            log.success('Push notification permission granted');

            // Register with FCM
            await PushNotifications.register();

            // Listen for registration success
            await PushNotifications.addListener('registration', async (token: Token) => {
                log.success('FCM token received:', token.value);

                const platform = Capacitor.getPlatform() as 'android' | 'ios';
                await saveFCMToken(token.value, platform);
            });

            // Listen for registration errors
            await PushNotifications.addListener('registrationError', (error: any) => {
                log.error('Push registration error:', error);

                // Show user-friendly error message
                if (error.error?.includes('google-services.json')) {
                    alert(
                        'Push notifications are not configured correctly. ' +
                        'Please contact support or reinstall the app.'
                    );
                }
            });

            // Listen for notifications received in foreground
            await PushNotifications.addListener(
                'pushNotificationReceived',
                handleForegroundNotification
            );

            // Listen for notification taps
            await PushNotifications.addListener(
                'pushNotificationActionPerformed',
                handleNotificationTap
            );

            log.success('Native push notifications initialized');
            return true;
        } else {
            log.warning('Push notification permission denied');
            return false;
        }
    } catch (error) {
        log.error('Failed to initialize native push:', error);
        return false;
    }
}

// ============================================================================
// WEB PUSH NOTIFICATIONS (PWA)
// ============================================================================

/**
 * Initialize web push notifications (PWA)
 * WHY: Support push notifications on web browsers
 * 
 * NOTE: Requires VAPID keys and service worker setup
 */
async function initializeWebPush(): Promise<boolean> {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            log.warning('Web push not supported in this browser');
            return false;
        }

        log.info('Initializing web push notifications...');

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            log.warning('Web push permission denied');
            return false;
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Subscribe to push notifications
            // NOTE: You need to generate VAPID keys for production
            // Use: npx web-push generate-vapid-keys
            const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;

            if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('your_key_here')) {
                log.warning('VAPID key not configured. Web push disabled.');
                return false;
            }

            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey as BufferSource,
            });
        }

        if (subscription) {
            // Save subscription to backend
            const subJson = subscription.toJSON();
            const token = subJson.endpoint || '';

            if (token) {
                await saveFCMToken(token, 'web');
                log.success('Web push subscription saved');
                return true;
            }
        }

        return false;
    } catch (error) {
        log.error('Failed to initialize web push:', error);
        return false;
    }
}

/**
 * Convert VAPID key to Uint8Array (BufferSource compatible)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as Uint8Array;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize FCM for the current platform
 * WHY: Single entry point for all platforms
 * 
 * Call this after user logs in
 */
export async function initializeFCM(): Promise<boolean> {
    try {
        const user = await getCurrentUser();
        if (!user) {
            log.warning('Cannot initialize FCM: User not logged in');
            return false;
        }

        log.info('Initializing FCM for platform:', Capacitor.getPlatform());

        if (Capacitor.isNativePlatform()) {
            // Android or iOS
            return await initializeNativePush();
        } else {
            // Web/PWA
            return await initializeWebPush();
        }
    } catch (error) {
        log.error('FCM initialization failed:', error);
        return false;
    }
}

/**
 * Clean up FCM when user logs out
 * WHY: Remove tokens to prevent notifications to logged-out users
 */
export async function cleanupFCM(): Promise<void> {
    try {
        log.info('Cleaning up FCM...');

        if (Capacitor.isNativePlatform()) {
            // Remove all listeners
            await PushNotifications.removeAllListeners();

            // Note: We don't unregister from FCM because the token might be reused
            // Instead, we mark it as inactive in the database

            // Get current token and mark as inactive
            // (This is handled by the backend when user logs out)
        } else {
            // Web push cleanup
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();

                if (subscription) {
                    const token = subscription.toJSON().endpoint || '';
                    if (token) {
                        await removeFCMToken(token);
                    }
                    await subscription.unsubscribe();
                }
            }
        }

        log.success('FCM cleanup complete');
    } catch (error) {
        log.error('FCM cleanup failed:', error);
    }
}

/**
 * Check if push notifications are enabled
 * WHY: Show UI to prompt user to enable notifications
 */
export async function isPushEnabled(): Promise<boolean> {
    try {
        if (Capacitor.isNativePlatform()) {
            const status = await PushNotifications.checkPermissions();
            return status.receive === 'granted';
        } else {
            if ('Notification' in window) {
                return Notification.permission === 'granted';
            }
            return false;
        }
    } catch (error) {
        log.error('Failed to check push status:', error);
        return false;
    }
}

/**
 * Request push notification permissions
 * WHY: Prompt user to enable notifications
 */
export async function requestPushPermissions(): Promise<boolean> {
    try {
        if (Capacitor.isNativePlatform()) {
            const result = await PushNotifications.requestPermissions();
            return result.receive === 'granted';
        } else {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            }
            return false;
        }
    } catch (error) {
        log.error('Failed to request push permissions:', error);
        return false;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    initializeFCM,
    cleanupFCM,
    isPushEnabled,
    requestPushPermissions,
    handleNotificationNavigation,
};
