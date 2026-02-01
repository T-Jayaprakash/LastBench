/**
 * ============================================================================
 * PRODUCTION-GRADE FCM NOTIFICATION SERVER
 * ============================================================================
 * 
 * Purpose: Listen to Supabase notification events and send FCM push notifications
 * 
 * Features:
 * - Multi-device support
 * - Automatic token cleanup (invalid/expired tokens)
 * - Batched notification delivery
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 * - Performance monitoring
 * - Graceful shutdown
 * 
 * Architecture:
 * 1. Listen to Supabase Realtime for new notifications
 * 2. Fetch user's active FCM tokens
 * 3. Build FCM payload with deep linking data
 * 4. Send to FCM with retry logic
 * 5. Clean up invalid tokens
 * 6. Update notification status in database
 * 
 * ============================================================================
 */

const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
require('dotenv').config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    SUPABASE_URL: 'https://koxukijufywvgnxqtuzz.supabase.co',
    BATCH_SIZE: 500, // FCM allows up to 500 tokens per multicast
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000, // Initial retry delay
    TOKEN_CLEANUP_THRESHOLD: 90, // Days of inactivity before token cleanup
};

// ============================================================================
// INITIALIZE SERVICES
// ============================================================================

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Initialize Supabase Client
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('❌ CRITICAL ERROR: Missing SUPABASE_SERVICE_ROLE_KEY');
    console.error('Please create a .env file in the server folder with:');
    console.error('SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    process.exit(1);
}

const supabase = createClient(CONFIG.SUPABASE_URL, supabaseKey);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Exponential backoff calculator
 */
const getRetryDelay = (attempt) => {
    return CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
};

/**
 * Format timestamp for logging
 */
const timestamp = () => new Date().toISOString();

/**
 * Log with timestamp
 */
const log = {
    info: (...args) => console.log(`[${timestamp()}] ℹ️`, ...args),
    success: (...args) => console.log(`[${timestamp()}] ✅`, ...args),
    warning: (...args) => console.warn(`[${timestamp()}] ⚠️`, ...args),
    error: (...args) => console.error(`[${timestamp()}] ❌`, ...args),
    debug: (...args) => {
        if (process.env.DEBUG === 'true') {
            console.log(`[${timestamp()}] 🐛`, ...args);
        }
    },
};

// ============================================================================
// FCM TOKEN MANAGEMENT
// ============================================================================

/**
 * Fetch active FCM tokens for a user
 * WHY: Users can have multiple devices. We need to send to all active tokens.
 */
async function getUserFCMTokens(userId) {
    try {
        const { data: tokens, error } = await supabase
            .from('fcm_tokens')
            .select('id, token, platform, device_id')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) {
            log.error('Error fetching FCM tokens:', error);
            return [];
        }

        // Filter out null/empty tokens
        return (tokens || []).filter(t => t.token && t.token.trim().length > 0);
    } catch (error) {
        log.error('Exception fetching FCM tokens:', error);
        return [];
    }
}

/**
 * Mark FCM token as inactive
 * WHY: Invalid tokens waste resources. Clean them up immediately.
 */
async function deactivateToken(tokenId, reason = 'invalid') {
    try {
        const { error } = await supabase
            .from('fcm_tokens')
            .update({
                is_active: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', tokenId);

        if (error) {
            log.error(`Failed to deactivate token ${tokenId}:`, error);
        } else {
            log.info(`Deactivated token ${tokenId} (reason: ${reason})`);
        }
    } catch (error) {
        log.error('Exception deactivating token:', error);
    }
}

/**
 * Update token last_used_at timestamp
 * WHY: Track token activity for cleanup of stale tokens
 */
async function updateTokenActivity(tokenIds) {
    if (!tokenIds || tokenIds.length === 0) return;

    try {
        const { error } = await supabase
            .from('fcm_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .in('id', tokenIds);

        if (error) {
            log.error('Failed to update token activity:', error);
        }
    } catch (error) {
        log.error('Exception updating token activity:', error);
    }
}

// ============================================================================
// FCM MESSAGE BUILDING
// ============================================================================

/**
 * Build FCM message payload
 * WHY: Consistent message format with proper deep linking data
 */
function buildFCMMessage(notification, tokens) {
    // Extract deep linking data
    const data = notification.data || {};

    return {
        notification: {
            title: notification.title || 'LastBench',
            body: notification.message || 'You have a new notification',
        },
        data: {
            // Core notification data
            notificationId: notification.id,
            type: notification.type,

            // Deep linking data
            postId: notification.post_id || data.postId || '',
            commentId: notification.comment_id || data.commentId || '',
            actorUserId: notification.actor_user_id || data.userId || '',

            // Additional metadata
            timestamp: notification.created_at,
            isBatched: notification.is_batched ? 'true' : 'false',
            batchCount: (notification.batch_count || 1).toString(),

            // Click action for deep linking
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        // Android-specific options
        android: {
            priority: 'high',
            notification: {
                channelId: 'default',
                sound: 'default',
                priority: 'high',
                defaultSound: true,
                defaultVibrateTimings: true,
            },
        },
        // iOS-specific options
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1, // You can make this dynamic based on unread count
                    contentAvailable: true,
                },
            },
        },
        // Web-specific options
        webpush: {
            notification: {
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                requireInteraction: false,
            },
            fcmOptions: {
                link: data.postId ? `/post/${data.postId}` : '/notifications',
            },
        },
        tokens: tokens,
    };
}

// ============================================================================
// FCM SENDING WITH RETRY LOGIC
// ============================================================================

/**
 * Send FCM message with retry logic
 * WHY: Network failures happen. Retry with exponential backoff.
 */
async function sendFCMWithRetry(message, tokenObjects, attempt = 0) {
    try {
        const response = await admin.messaging().sendEachForMulticast(message);

        log.success(
            `Sent to ${response.successCount}/${message.tokens.length} devices. ` +
            `Failed: ${response.failureCount}`
        );

        // Process failures and clean up invalid tokens
        if (response.failureCount > 0) {
            const tokensToDeactivate = [];
            const tokensToRetry = [];

            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    const tokenObj = tokenObjects[idx];

                    log.debug(`Token ${idx} failed:`, errorCode, resp.error?.message);

                    // Determine if error is permanent or temporary
                    if (
                        errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-argument'
                    ) {
                        // Permanent error - deactivate token
                        tokensToDeactivate.push(tokenObj.id);
                    } else if (
                        errorCode === 'messaging/server-unavailable' ||
                        errorCode === 'messaging/internal-error' ||
                        errorCode === 'messaging/unavailable'
                    ) {
                        // Temporary error - retry
                        tokensToRetry.push(tokenObj);
                    } else {
                        // Unknown error - log and deactivate to be safe
                        log.warning(`Unknown FCM error code: ${errorCode}`);
                        tokensToDeactivate.push(tokenObj.id);
                    }
                }
            });

            // Deactivate invalid tokens
            if (tokensToDeactivate.length > 0) {
                log.info(`Deactivating ${tokensToDeactivate.length} invalid tokens`);
                await Promise.all(
                    tokensToDeactivate.map(id => deactivateToken(id, 'fcm_error'))
                );
            }

            // Retry temporary failures
            if (tokensToRetry.length > 0 && attempt < CONFIG.RETRY_ATTEMPTS) {
                const retryDelay = getRetryDelay(attempt);
                log.info(
                    `Retrying ${tokensToRetry.length} tokens after ${retryDelay}ms ` +
                    `(attempt ${attempt + 1}/${CONFIG.RETRY_ATTEMPTS})`
                );
                await sleep(retryDelay);

                const retryMessage = {
                    ...message,
                    tokens: tokensToRetry.map(t => t.token),
                };
                return await sendFCMWithRetry(retryMessage, tokensToRetry, attempt + 1);
            }
        }

        // Update activity for successful tokens
        const successfulTokenIds = tokenObjects
            .filter((_, idx) => response.responses[idx]?.success)
            .map(t => t.id);

        if (successfulTokenIds.length > 0) {
            await updateTokenActivity(successfulTokenIds);
        }

        return response;
    } catch (error) {
        log.error('FCM send exception:', error);

        // Retry on exception if attempts remaining
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
            const retryDelay = getRetryDelay(attempt);
            log.info(`Retrying after exception in ${retryDelay}ms`);
            await sleep(retryDelay);
            return await sendFCMWithRetry(message, tokenObjects, attempt + 1);
        }

        throw error;
    }
}

/**
 * Send notification to user with batching support
 * WHY: FCM has a limit of 500 tokens per request. Batch large sends.
 */
async function sendNotificationToUser(notification) {
    const userId = notification.user_id;

    log.info(`Processing notification ${notification.id} for user ${userId}`);

    // Fetch user's FCM tokens
    const tokenObjects = await getUserFCMTokens(userId);

    if (!tokenObjects || tokenObjects.length === 0) {
        log.warning(`No active FCM tokens for user ${userId}. Skipping push.`);
        return { success: false, reason: 'no_tokens' };
    }

    log.info(`Found ${tokenObjects.length} active token(s) for user ${userId}`);

    // Split tokens into batches of 500 (FCM limit)
    const batches = [];
    for (let i = 0; i < tokenObjects.length; i += CONFIG.BATCH_SIZE) {
        batches.push(tokenObjects.slice(i, i + CONFIG.BATCH_SIZE));
    }

    log.info(`Sending in ${batches.length} batch(es)`);

    // Send to each batch
    const results = [];
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const tokens = batch.map(t => t.token);

        log.debug(`Batch ${i + 1}/${batches.length}: ${tokens.length} tokens`);

        const message = buildFCMMessage(notification, tokens);

        try {
            const result = await sendFCMWithRetry(message, batch);
            results.push(result);
        } catch (error) {
            log.error(`Batch ${i + 1} failed completely:`, error);
            results.push({ successCount: 0, failureCount: tokens.length });
        }
    }

    // Aggregate results
    const totalSuccess = results.reduce((sum, r) => sum + (r.successCount || 0), 0);
    const totalFailure = results.reduce((sum, r) => sum + (r.failureCount || 0), 0);

    log.success(
        `Notification ${notification.id} complete: ` +
        `${totalSuccess} sent, ${totalFailure} failed`
    );

    // Update notification status in database
    await updateNotificationStatus(notification.id, totalSuccess > 0);

    return {
        success: totalSuccess > 0,
        successCount: totalSuccess,
        failureCount: totalFailure,
    };
}

/**
 * Update notification push status
 * WHY: Track which notifications were successfully pushed
 */
async function updateNotificationStatus(notificationId, success) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({
                is_pushed: success,
                push_sent_at: new Date().toISOString(),
            })
            .eq('id', notificationId);

        if (error) {
            log.error(`Failed to update notification ${notificationId} status:`, error);
        }
    } catch (error) {
        log.error('Exception updating notification status:', error);
    }
}

// ============================================================================
// REALTIME LISTENER
// ============================================================================

/**
 * Start listening for new notifications
 * WHY: Real-time notification delivery as soon as they're created
 */
function startNotificationListener() {
    log.info('🚀 LastBench Notification Server Started!');
    log.info('📡 Listening for new notifications...');
    log.info('');

    const channel = supabase
        .channel('notifications-channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
            },
            async (payload) => {
                const notification = payload.new;

                log.info('');
                log.info('═══════════════════════════════════════════════════════');
                log.info(`🔔 New ${notification.type} notification`);
                log.info(`   User: ${notification.user_id}`);
                log.info(`   Message: ${notification.message}`);
                log.info('═══════════════════════════════════════════════════════');

                try {
                    await sendNotificationToUser(notification);
                } catch (error) {
                    log.error('Failed to process notification:', error);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                log.success('✅ Successfully subscribed to notifications channel');
            } else if (status === 'CHANNEL_ERROR') {
                log.error('❌ Channel subscription error');
            } else if (status === 'TIMED_OUT') {
                log.error('❌ Channel subscription timed out');
            } else {
                log.debug(`Channel status: ${status}`);
            }
        });

    return channel;
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

let notificationChannel = null;

async function gracefulShutdown(signal) {
    log.info('');
    log.info(`Received ${signal}. Shutting down gracefully...`);

    if (notificationChannel) {
        await supabase.removeChannel(notificationChannel);
        log.info('Unsubscribed from notification channel');
    }

    log.info('Goodbye! 👋');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================================
// STARTUP
// ============================================================================

// Start the notification listener
notificationChannel = startNotificationListener();

// Optional: Run token cleanup on startup
(async () => {
    try {
        log.info('Running initial FCM token cleanup...');
        const { error } = await supabase.rpc('cleanup_stale_fcm_tokens');
        if (error) {
            log.warning('Token cleanup failed:', error);
        } else {
            log.success('Token cleanup completed');
        }
    } catch (error) {
        log.warning('Token cleanup exception:', error);
    }
})();

// ============================================================================
// HEALTH CHECK ENDPOINT (Optional - for monitoring)
// ============================================================================

if (process.env.ENABLE_HEALTH_CHECK === 'true') {
    const http = require('http');
    const PORT = process.env.HEALTH_CHECK_PORT || 3000;

    http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }).listen(PORT, () => {
        log.info(`Health check endpoint running on http://localhost:${PORT}/health`);
    });
}
