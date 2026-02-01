# 🔔 Production-Grade Push Notification System

## Overview

This is a complete Instagram-style push notification system built with:
- **Firebase Cloud Messaging (FCM)** for push delivery
- **Supabase/PostgreSQL** for notification storage and event triggers
- **React/Capacitor** for cross-platform client support (Android, iOS, Web)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                             │
│  (Like Post, Comment, Follow, etc.)                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Database Triggers (PostgreSQL)                           │  │
│  │  - on_interaction_like → create_notification()           │  │
│  │  - on_comment_created → create_notification()            │  │
│  │  - Rate limiting & spam control                          │  │
│  │  - Notification batching (5-min window)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  notifications table                                      │  │
│  │  - Stores all notifications                              │  │
│  │  - Triggers Realtime event                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ (Realtime subscription)
┌─────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION SERVER (Node.js)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  1. Listen to Supabase Realtime                          │  │
│  │  2. Fetch user's FCM tokens (multi-device)               │  │
│  │  3. Build FCM payload with deep linking data             │  │
│  │  4. Send via Firebase Admin SDK                          │  │
│  │  5. Handle failures & clean up invalid tokens            │  │
│  │  6. Retry with exponential backoff                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼ (FCM Push)
┌─────────────────────────────────────────────────────────────────┐
│                    USER DEVICES                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Android    │  │     iOS      │  │     Web      │          │
│  │              │  │              │  │              │          │
│  │  FCM Service │  │  FCM Service │  │  FCM Service │          │
│  │  - Foreground│  │  - Foreground│  │  - Foreground│          │
│  │  - Background│  │  - Background│  │  - Background│          │
│  │  - Terminated│  │  - Terminated│  │  - Terminated│          │
│  │              │  │              │  │              │          │
│  │  Deep Link   │  │  Deep Link   │  │  Deep Link   │          │
│  │  Navigation  │  │  Navigation  │  │  Navigation  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### ✅ Core Features
- **Multi-device support**: Users can receive notifications on all their devices
- **Event-driven triggers**: Automatic notifications for likes, comments, follows
- **Smart batching**: Combine multiple similar notifications (e.g., "John and 5 others liked your post")
- **Rate limiting**: Prevent spam (max 10 notifications per 5-minute window)
- **Deep linking**: Tap notification → navigate to relevant content
- **Foreground/Background/Terminated**: Works in all app states
- **Cross-platform**: Android, iOS, and Web (PWA)

### 🛡️ Security & Privacy
- **Row Level Security (RLS)**: Users can only see their own notifications
- **User preferences**: Control which notification types to receive
- **Quiet hours**: Don't disturb during specified hours
- **No self-notifications**: Don't notify users about their own actions

### 🚀 Performance & Reliability
- **Automatic token cleanup**: Remove stale tokens after 90 days
- **Retry logic**: Exponential backoff for failed deliveries
- **Batch sending**: Up to 500 tokens per FCM request
- **Database indexes**: Optimized queries for fast notification fetching
- **Graceful degradation**: App works even if push fails

## Database Schema

### 1. `fcm_tokens` - Device Token Storage
```sql
CREATE TABLE fcm_tokens (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  token text NOT NULL,
  device_id text,
  platform text CHECK (platform IN ('android', 'ios', 'web')),
  app_version text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);
```

### 2. `notifications` - Notification Storage
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  type text CHECK (type IN ('like', 'comment', 'reply', 'follow', 'mention', 'system')),
  actor_user_id uuid REFERENCES profiles(id),
  post_id uuid REFERENCES posts(id),
  comment_id uuid REFERENCES comments(id),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  is_pushed boolean DEFAULT false,
  push_sent_at timestamptz,
  batch_key text,
  is_batched boolean DEFAULT false,
  batch_count int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
```

### 3. `notification_preferences` - User Settings
```sql
CREATE TABLE notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  likes_enabled boolean DEFAULT true,
  comments_enabled boolean DEFAULT true,
  replies_enabled boolean DEFAULT true,
  follows_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  quiet_hours_start int,
  quiet_hours_end int
);
```

## Setup Instructions

### 1. Database Setup

Run the SQL migration:
```bash
# In Supabase SQL Editor, run:
cat sql/notification_system_schema.sql
```

This creates:
- All notification tables
- Database triggers for auto-notifications
- Helper functions for rate limiting
- Row Level Security policies
- Realtime subscriptions

### 2. Server Setup

The notification server runs on your machine or a cloud server:

```bash
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your SUPABASE_SERVICE_ROLE_KEY

# Start the server
npm start
```

**Environment Variables:**
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DEBUG=true                    # Optional: Enable debug logging
ENABLE_HEALTH_CHECK=true      # Optional: Enable health check endpoint
HEALTH_CHECK_PORT=3000        # Optional: Health check port
```

**Firebase Setup:**
- Place your `service-account.json` in the `server/` directory
- Get this from Firebase Console → Project Settings → Service Accounts

### 3. Client Setup

#### Install Dependencies
Already included in `package.json`:
```json
{
  "@capacitor/push-notifications": "^7.0.3",
  "@capacitor/app": "^7.1.0"
}
```

#### Initialize FCM in Your App

```typescript
import { initializeFCM, cleanupFCM } from './services/fcmService';

// After user logs in
async function onUserLogin() {
  await initializeFCM();
}

// When user logs out
async function onUserLogout() {
  await cleanupFCM();
}
```

#### Handle Notifications

The FCM service automatically handles:
- Token registration
- Foreground notifications
- Background notifications
- Deep linking navigation

You can listen for foreground notifications:
```typescript
window.addEventListener('fcm-notification', (event: CustomEvent) => {
  const { notification, data } = event.detail;
  // Show in-app toast/banner
  // Update notification bell badge
});
```

### 4. Android Configuration

#### `android/app/google-services.json`
Download from Firebase Console and place in `android/app/`

#### `android/app/src/main/AndroidManifest.xml`
```xml
<application>
  <!-- ... -->
  
  <!-- FCM Service -->
  <service
    android:name="com.google.firebase.messaging.FirebaseMessagingService"
    android:exported="false">
    <intent-filter>
      <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
  </service>
</application>
```

### 5. iOS Configuration

#### `ios/App/App/GoogleService-Info.plist`
Download from Firebase Console and add to Xcode project

#### Enable Push Notifications in Xcode
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select your app target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Push Notifications"
6. Add "Background Modes" → Check "Remote notifications"

#### Upload APNs Certificate to Firebase
1. Generate APNs certificate in Apple Developer Portal
2. Upload to Firebase Console → Project Settings → Cloud Messaging → iOS

### 6. Web/PWA Configuration

#### Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```

#### Add to Environment
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

#### Service Worker
The existing `service-worker.js` should handle push events:
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.notification.title, {
    body: data.notification.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  // Navigate to appropriate URL
  const url = data.postId ? `/post/${data.postId}` : '/notifications';
  event.waitUntil(clients.openWindow(url));
});
```

## Notification Types

### Like Notification
```typescript
{
  type: 'like',
  title: 'LastBench',
  message: 'John liked your post',
  data: {
    postId: 'uuid',
    actorUserId: 'uuid'
  }
}
```

### Comment Notification
```typescript
{
  type: 'comment',
  title: 'LastBench',
  message: 'Sarah commented on your post',
  data: {
    postId: 'uuid',
    commentId: 'uuid',
    actorUserId: 'uuid'
  }
}
```

### Batched Notification
```typescript
{
  type: 'like',
  title: 'LastBench',
  message: 'John and 5 others liked your post',
  isBatched: true,
  batchCount: 6,
  data: {
    postId: 'uuid'
  }
}
```

## Deep Linking

When a user taps a notification, they're navigated to:

| Type | Destination |
|------|-------------|
| `like` | `/post/{postId}` |
| `comment` | `/post/{postId}?commentId={commentId}` |
| `reply` | `/post/{postId}?commentId={commentId}` |
| `follow` | `/profile/{actorUserId}` |
| `mention` | `/post/{postId}` |
| Default | `/notifications` |

**Customize navigation** in `services/fcmService.ts` → `handleNotificationNavigation()`

## Testing

### Test Database Triggers
```sql
-- Simulate a like (should create notification)
INSERT INTO interactions (user_id, post_id, type)
VALUES ('user-uuid', 'post-uuid', 'like');

-- Check if notification was created
SELECT * FROM notifications WHERE user_id = 'post-owner-uuid';
```

### Test Server
```bash
cd server
npm start

# In another terminal, trigger a notification via database
# Watch server logs for FCM send confirmation
```

### Test Client
```typescript
// Check if push is enabled
import { isPushEnabled } from './services/fcmService';
const enabled = await isPushEnabled();
console.log('Push enabled:', enabled);

// Request permissions
import { requestPushPermissions } from './services/fcmService';
const granted = await requestPushPermissions();
console.log('Permission granted:', granted);
```

## Monitoring & Debugging

### Server Logs
```bash
# Enable debug mode
DEBUG=true npm start

# Check health endpoint (if enabled)
curl http://localhost:3000/health
```

### Database Queries
```sql
-- Check active FCM tokens
SELECT user_id, platform, COUNT(*) 
FROM fcm_tokens 
WHERE is_active = true 
GROUP BY user_id, platform;

-- Check notification delivery rate
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_pushed = true) as pushed,
  COUNT(*) FILTER (WHERE is_pushed = false) as failed
FROM notifications
WHERE created_at > now() - interval '24 hours';

-- Check rate limiting
SELECT * FROM notification_rate_limits
WHERE window_start > now() - interval '1 hour';
```

### Firebase Console
- View delivery statistics
- Check for invalid tokens
- Monitor quota usage

## Production Deployment

### Server Deployment Options

#### Option 1: Cloud Run (Google Cloud)
```bash
# Build Docker image
docker build -t gcr.io/your-project/notification-server .

# Deploy
gcloud run deploy notification-server \
  --image gcr.io/your-project/notification-server \
  --platform managed \
  --region us-central1 \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=xxx
```

#### Option 2: Heroku
```bash
heroku create lastbench-notifications
heroku config:set SUPABASE_SERVICE_ROLE_KEY=xxx
git push heroku main
```

#### Option 3: VPS (DigitalOcean, AWS EC2)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo and install
cd /opt
git clone your-repo
cd server
npm install --production

# Setup PM2 for process management
npm install -g pm2
pm2 start index.js --name notification-server
pm2 startup
pm2 save
```

### Database Maintenance

#### Cleanup Old Notifications (Cron Job)
```sql
-- Run daily via pg_cron or external scheduler
SELECT cleanup_old_notifications();
SELECT cleanup_stale_fcm_tokens();
```

#### Backup Strategy
- Supabase handles automatic backups
- For self-hosted: Use `pg_dump` daily

## Troubleshooting

### Notifications Not Received

1. **Check FCM token is saved**
   ```sql
   SELECT * FROM fcm_tokens WHERE user_id = 'your-user-id';
   ```

2. **Check notification was created**
   ```sql
   SELECT * FROM notifications WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 5;
   ```

3. **Check server logs**
   ```bash
   # Look for errors in server output
   ```

4. **Check Firebase Console**
   - Invalid tokens?
   - Quota exceeded?
   - Configuration errors?

### Android: "google-services.json" Error
- Download correct file from Firebase Console
- Place in `android/app/google-services.json`
- Rebuild: `npx cap sync android`

### iOS: Not Receiving Push
- Check APNs certificate is uploaded to Firebase
- Verify "Push Notifications" capability is enabled in Xcode
- Test with a physical device (simulator doesn't support push)

### Web: VAPID Key Error
- Generate keys: `npx web-push generate-vapid-keys`
- Add public key to `.env`: `VITE_VAPID_PUBLIC_KEY=xxx`
- Rebuild: `npm run build`

## Performance Optimization

### Database Indexes
Already created by schema:
```sql
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id) WHERE is_active = true;
CREATE INDEX idx_notifications_user_id_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_batch_key ON notifications(batch_key);
```

### Rate Limiting Tuning
Adjust in `sql/notification_system_schema.sql`:
```sql
v_max_per_window int := 10; -- Change this value
```

### Batch Window Tuning
Adjust batching window (default: 5 minutes):
```sql
WHERE created_at > now() - interval '5 minutes'  -- Change this
```

## Security Best Practices

✅ **Implemented:**
- Row Level Security (RLS) on all tables
- Service role key stored in environment variables
- Firebase Admin SDK (server-side only)
- Token validation and cleanup
- Rate limiting to prevent abuse

❌ **Never Do:**
- Expose `SUPABASE_SERVICE_ROLE_KEY` to client
- Expose Firebase `service-account.json` to client
- Allow users to send notifications to other users directly
- Store sensitive data in notification payloads

## Cost Estimation

### Firebase (Free Tier)
- 10,000 messages/day: **FREE**
- Beyond: $0.50 per 1M messages

### Supabase (Free Tier)
- 500 MB database: **FREE**
- Realtime: **FREE**
- Beyond: $25/month for Pro

### Server Hosting
- Cloud Run: ~$5/month (minimal usage)
- Heroku: $7/month (Eco dyno)
- VPS: $5-10/month

**Total estimated cost for 10K users:** $10-20/month

## License

MIT

## Support

For issues or questions:
1. Check this README
2. Check server logs
3. Check Supabase logs
4. Check Firebase Console
5. Open an issue on GitHub

---

**Built with ❤️ for LastBench** 🎓
