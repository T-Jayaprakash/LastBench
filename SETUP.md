# 🚀 LastBench - Quick Setup Guide

## For New Developers

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd genfess-app-2
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Set Up Database
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard)
2. Run the following SQL files in order:
   - `sql/antigravity_indexes_and_rpcs.sql`
   - `sql/notification_system_schema.sql`

### 5. Set Up Firebase (for Push Notifications)

#### Get Firebase Config Files:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Download config files:
   - **Android**: `google-services.json` → place in `android/app/`
   - **iOS**: `GoogleService-Info.plist` → add to Xcode project
   - **Server**: Service account JSON → place in `server/service-account.json`

### 6. Run Development Server
```bash
npm run dev
```

### 7. Set Up Notification Server
```bash
cd server
npm install
cp .env.example .env
# Edit .env and add SUPABASE_SERVICE_ROLE_KEY
npm start
```

Keep the notification server running in a separate terminal!

---

## For Deployment

### Quick Deploy (Automated)
```bash
./deploy.sh
```

This will:
- ✅ Bump version
- ✅ Build the app
- ✅ Commit to git
- ✅ Push to remote
- ✅ Deploy to Netlify
- ✅ Optionally build APK

### Manual Deploy

#### Web (Netlify)
```bash
npm run build
netlify deploy --prod --dir=dist
```

#### Android APK
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

#### iOS
```bash
npm run build
npx cap sync ios
npx cap open ios
# Build in Xcode
```

---

## Project Structure

```
genfess-app-2/
├── components/          # React components
├── services/           # API services
│   ├── api.ts         # Supabase API calls
│   ├── fcmService.ts  # Push notifications (NEW!)
│   └── userService.ts # User management
├── views/             # Page components
├── sql/               # Database migrations
│   ├── antigravity_indexes_and_rpcs.sql
│   └── notification_system_schema.sql  # NEW!
├── server/            # Notification server (NEW!)
│   ├── index.js      # FCM server
│   ├── .env.example  # Environment template
│   └── README.md     # Server documentation
├── docs/              # Documentation
│   └── PUSH_NOTIFICATIONS.md  # NEW!
├── android/           # Android app
├── ios/              # iOS app
└── deploy.sh         # Deployment script (NEW!)
```

---

## New Features (v2.10.7+)

### 🔔 Push Notification System
- **Multi-device support**: Receive notifications on all devices
- **Smart batching**: "John and 5 others liked your post"
- **Rate limiting**: Prevent spam
- **Deep linking**: Tap notification → view content
- **Cross-platform**: Android, iOS, Web

**Documentation**: See `docs/PUSH_NOTIFICATIONS.md`

### 📊 Database Optimizations
- Notification storage with RLS
- FCM token management
- Rate limiting tables
- User preferences

### 🚀 Deployment Automation
- One-command deployment: `./deploy.sh`
- Automatic version bumping
- Git integration
- Netlify deployment

---

## Environment Variables

### Client (.env.local)
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_USE_SUPABASE_REALTIME=true
VITE_VAPID_PUBLIC_KEY=your_vapid_key  # For web push
```

### Server (server/.env)
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEBUG=true  # Optional
ENABLE_HEALTH_CHECK=true  # Optional
```

---

## Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Push Notifications Not Working
1. Check server is running: `cd server && npm start`
2. Check database migration was run
3. Check FCM tokens in database: `SELECT * FROM fcm_tokens;`
4. Check server logs for errors

### Android Build Issues
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

---

## Support

- **Full Documentation**: `docs/PUSH_NOTIFICATIONS.md`
- **Server Setup**: `server/README.md`
- **Database Schema**: `sql/notification_system_schema.sql`

---

**Happy Coding! 🎓**
