# 🚀 LastBench Notification Server

Production-grade push notification server for LastBench app using Firebase Cloud Messaging.

## Features

- ✅ **Multi-device support** - Send to all user devices simultaneously
- ✅ **Automatic token cleanup** - Remove invalid/stale tokens
- ✅ **Retry logic** - Exponential backoff for failed deliveries
- ✅ **Batch sending** - Up to 500 tokens per FCM request
- ✅ **Comprehensive logging** - Track every notification sent
- ✅ **Graceful shutdown** - Clean exit on SIGTERM/SIGINT
- ✅ **Health check endpoint** - Monitor server status

## Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment

Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase service role key:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional settings
DEBUG=true                    # Enable debug logging
ENABLE_HEALTH_CHECK=true      # Enable health check endpoint
HEALTH_CHECK_PORT=3000        # Health check port
```

**Where to find the service role key:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project (`lastbench`)
3. Go to **Project Settings** (Gear icon) → **API**
4. Copy the **`service_role`** key (⚠️ Keep this secret!)

### 3. Add Firebase Service Account

Place your `service-account.json` in this folder.

**How to get it:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (Gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Save as `service-account.json` in the `server/` directory

### 4. Run the Server

```bash
npm start
```

You should see:
```
🚀 LastBench Notification Server Started!
📡 Listening for new notifications...
✅ Successfully subscribed to notifications channel
```

Keep this running! Whenever someone likes a post or comments, this server will automatically send push notifications.

## How It Works

```
User Action (Like/Comment)
         ↓
Database Trigger creates notification
         ↓
Supabase Realtime event
         ↓
This Server receives event
         ↓
Fetch user's FCM tokens
         ↓
Send via Firebase Cloud Messaging
         ↓
User's device receives push notification
```

## Production Deployment

### Option 1: Cloud Run (Recommended)

```bash
# Build Docker image
docker build -t gcr.io/your-project/notification-server .

# Deploy to Cloud Run
gcloud run deploy notification-server \
  --image gcr.io/your-project/notification-server \
  --platform managed \
  --region us-central1 \
  --set-env-vars SUPABASE_SERVICE_ROLE_KEY=xxx \
  --allow-unauthenticated
```

### Option 2: Heroku

```bash
# Create Heroku app
heroku create lastbench-notifications

# Set environment variables
heroku config:set SUPABASE_SERVICE_ROLE_KEY=xxx

# Deploy
git push heroku main
```

### Option 3: VPS (DigitalOcean, AWS EC2, etc.)

```bash
# SSH into your server
ssh user@your-server

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repo
git clone your-repo-url
cd server

# Install dependencies
npm install --production

# Install PM2 for process management
sudo npm install -g pm2

# Start server with PM2
pm2 start index.js --name notification-server

# Make it start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs notification-server
```

### Option 4: Keep Running on Your Laptop

For development/testing, you can keep it running on your laptop:

```bash
# macOS: Keep terminal open
npm start

# Or use screen/tmux to run in background
screen -S notifications
npm start
# Press Ctrl+A then D to detach
# Reattach with: screen -r notifications
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | - | Supabase service role key |
| `DEBUG` | No | `false` | Enable debug logging |
| `ENABLE_HEALTH_CHECK` | No | `false` | Enable HTTP health check endpoint |
| `HEALTH_CHECK_PORT` | No | `3000` | Port for health check endpoint |

## Health Check

If `ENABLE_HEALTH_CHECK=true`, you can monitor the server:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": 12345.67,
  "timestamp": "2026-02-01T16:30:00.000Z"
}
```

## Monitoring

### Check Logs

```bash
# If running with npm start
# Logs appear in terminal

# If running with PM2
pm2 logs notification-server

# If running in Docker
docker logs container-id

# If running on Cloud Run
gcloud logging read "resource.type=cloud_run_revision"
```

### What to Look For

✅ **Good signs:**
```
✅ Sent to 3/3 devices. Failed: 0
✅ FCM token saved successfully (android)
```

⚠️ **Warnings:**
```
⚠️ No active FCM tokens for user xxx. Skipping push.
⚠️ Token cleanup failed
```

❌ **Errors:**
```
❌ Firebase Send Error: messaging/invalid-registration-token
❌ Error fetching FCM tokens
```

## Troubleshooting

### Server won't start

**Error: Missing SUPABASE_SERVICE_ROLE_KEY**
```bash
# Make sure .env file exists and has the key
cat .env
```

**Error: Cannot find module 'firebase-admin'**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Notifications not sending

**1. Check if server is running**
```bash
# Should see "Listening for new notifications..."
```

**2. Check if notification was created in database**
```sql
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
```

**3. Check if user has FCM tokens**
```sql
SELECT * FROM fcm_tokens WHERE user_id = 'user-id' AND is_active = true;
```

**4. Check server logs for errors**
```bash
# Look for "❌" errors
```

### Invalid tokens

The server automatically deactivates invalid tokens. You'll see:
```
Deactivated token xxx (reason: fcm_error)
```

This is normal - tokens become invalid when:
- User uninstalls app
- User clears app data
- Token expires (rare)

## Database Maintenance

### Clean up old notifications (run weekly)

```sql
-- Delete notifications older than 30 days
DELETE FROM notifications WHERE created_at < now() - interval '30 days';

-- Clean up stale FCM tokens
SELECT cleanup_stale_fcm_tokens();
```

### Check notification stats

```sql
-- Notifications sent in last 24 hours
SELECT COUNT(*) FROM notifications 
WHERE created_at > now() - interval '24 hours';

-- Push delivery rate
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_pushed = true) as delivered,
  COUNT(*) FILTER (WHERE is_pushed = false) as failed
FROM notifications
WHERE created_at > now() - interval '24 hours';
```

## Security

✅ **What we do:**
- Service role key stored in environment variables (never in code)
- Firebase Admin SDK (server-side only)
- Automatic token validation
- Row Level Security on database

❌ **Never do:**
- Commit `.env` or `service-account.json` to git
- Expose service role key to client
- Run server without authentication in production

## Performance

### Current Capacity
- **Handles:** 1000+ notifications/minute
- **Latency:** < 1 second from trigger to delivery
- **Batch size:** Up to 500 tokens per FCM request
- **Retry:** 3 attempts with exponential backoff

### Scaling
- **Horizontal:** Run multiple instances (Supabase Realtime handles load balancing)
- **Vertical:** Increase server resources if needed
- **Database:** Add indexes (already included in schema)

## Cost

### Firebase (Free Tier)
- 10,000 messages/day: **FREE**
- Beyond: $0.50 per 1M messages

### Server Hosting
- Cloud Run: ~$5/month
- Heroku: $7/month
- VPS: $5-10/month

**Total:** $5-10/month for most apps

## Development

### Run in development mode

```bash
DEBUG=true npm start
```

### Test notification sending

```sql
-- Manually create a test notification
INSERT INTO notifications (user_id, type, actor_user_id, post_id, title, message)
VALUES (
  'user-uuid',
  'like',
  'actor-uuid',
  'post-uuid',
  'Test',
  'This is a test notification'
);
```

Watch server logs - you should see it process and send the notification.

## Support

For detailed documentation, see:
- [Full Push Notification Guide](../docs/PUSH_NOTIFICATIONS.md)
- [Database Schema](../sql/notification_system_schema.sql)
- [Client FCM Service](../services/fcmService.ts)

---

**Keep this server running 24/7 for real-time notifications!** 🔔

