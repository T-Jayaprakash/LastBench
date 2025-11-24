# 🚀 Quick Start - Supabase Realtime

## ⚡ 5-Minute Setup

### 1. Set Environment Variables
```bash
# Create .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_USE_SUPABASE_REALTIME=true
```

### 2. Run SQL in Supabase Dashboard
```sql
-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE interactions;

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT CHECK (type IN ('like', 'comment', 'reply', 'mention')),
    post_id UUID REFERENCES posts(id),
    actor_id UUID NOT NULL,
    actor_name TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 3. Test It
```bash
npm run dev
# Open http://localhost:5173 in 2 tabs
# Create a post in tab 1
# Watch it appear instantly in tab 2! 🎉
```

## 📱 Features You Get

✅ **Real-time Posts** - New posts appear instantly  
✅ **Live Comments** - Comments update in real-time  
✅ **Instant Likes** - Like counts update without refresh  
✅ **Notifications** - Bell icon with Instagram-style notifications  
✅ **Vibration Feedback** - Haptic feedback on new content  

## 🧪 Test Component

```typescript
// Add to App.tsx for debugging:
import RealtimeTest from './components/RealtimeTest';

// Inside render:
<RealtimeTest />
```

## 📚 Full Documentation

- **`REALTIME_COMPLETE.md`** - Complete implementation guide
- **`supabase-realtime-README.md`** - Setup & troubleshooting
- **`README.md`** - Project overview

## 🐛 Troubleshooting

**Realtime not working?**
1. Check `.env.local` has `VITE_USE_SUPABASE_REALTIME=true`
2. Verify SQL commands ran in Supabase
3. Open browser console, look for "🔌 Setting up Realtime"

**Build failing?**
```bash
rm -rf node_modules
npm install
npm run build
```

## 🎯 What to Test

- [ ] Open app in 2 browser tabs
- [ ] Create post in tab 1 → appears in tab 2
- [ ] Like a post → count updates everywhere
- [ ] Click notification bell → see live updates
- [ ] Edit a post → changes reflect instantly

## ✨ That's It!

You now have Instagram-level real-time features! 🚀

**Branch**: `feature/supabase-realtime`  
**Status**: ✅ Production Ready
