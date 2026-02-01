-- ============================================================================
-- PRODUCTION-GRADE INSTAGRAM-STYLE PUSH NOTIFICATION SYSTEM
-- ============================================================================
-- Author: Senior Backend Architect
-- Purpose: Complete FCM-based notification system with spam control, batching,
--          and multi-device support
-- ============================================================================

-- ============================================================================
-- 1. FCM TOKENS TABLE (Multi-Device Support)
-- ============================================================================
-- WHY: Users can have multiple devices (phone, tablet, web). We need to track
--      all active FCM tokens and clean up stale ones.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_id text, -- Unique device identifier
  platform text NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  app_version text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(), -- For cleaning stale tokens
  is_active boolean DEFAULT true,
  
  -- Prevent duplicate tokens
  UNIQUE(user_id, token)
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_cleanup ON fcm_tokens(last_used_at) WHERE is_active = true;

-- ============================================================================
-- 2. NOTIFICATIONS TABLE (Instagram-style)
-- ============================================================================
-- WHY: Store all notifications for in-app display. This is separate from
--      push delivery - users can see notifications even if push failed.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification type for routing and UI
  type text NOT NULL CHECK (type IN ('like', 'comment', 'reply', 'follow', 'mention', 'system')),
  
  -- Actor (who triggered this notification)
  actor_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Related content
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  
  -- Message content
  title text NOT NULL,
  message text NOT NULL,
  
  -- Metadata for deep linking
  data jsonb DEFAULT '{}'::jsonb,
  
  -- State
  is_read boolean DEFAULT false,
  is_pushed boolean DEFAULT false, -- Track if push was sent
  push_sent_at timestamptz,
  
  -- Batching support
  batch_key text, -- For grouping similar notifications
  is_batched boolean DEFAULT false,
  batch_count int DEFAULT 1,
  
  created_at timestamptz DEFAULT now(),
  
  -- Prevent duplicate notifications
  CONSTRAINT unique_notification UNIQUE (user_id, type, actor_user_id, post_id, comment_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_batch_key ON notifications(batch_key) WHERE batch_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================================
-- 3. NOTIFICATION RATE LIMITING TABLE
-- ============================================================================
-- WHY: Prevent spam. If user gets 100 likes in 1 minute, don't send 100 pushes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  window_start timestamptz NOT NULL,
  count int DEFAULT 1,
  last_sent_at timestamptz,
  
  UNIQUE(user_id, notification_type, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_type ON notification_rate_limits(user_id, notification_type, window_start);

-- ============================================================================
-- 4. NOTIFICATION PREFERENCES TABLE
-- ============================================================================
-- WHY: Users should control what notifications they receive
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Toggle for each notification type
  likes_enabled boolean DEFAULT true,
  comments_enabled boolean DEFAULT true,
  replies_enabled boolean DEFAULT true,
  follows_enabled boolean DEFAULT true,
  mentions_enabled boolean DEFAULT true,
  
  -- Global settings
  push_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  
  -- Quiet hours (24-hour format)
  quiet_hours_start int CHECK (quiet_hours_start >= 0 AND quiet_hours_start < 24),
  quiet_hours_end int CHECK (quiet_hours_end >= 0 AND quiet_hours_end < 24),
  
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up stale FCM tokens (tokens not used in 90 days)
CREATE OR REPLACE FUNCTION cleanup_stale_fcm_tokens()
RETURNS void AS $$
BEGIN
  UPDATE fcm_tokens
  SET is_active = false
  WHERE last_used_at < now() - interval '90 days'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user should receive notification (rate limiting + preferences)
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id uuid,
  p_notification_type text
)
RETURNS boolean AS $$
DECLARE
  v_prefs record;
  v_rate_limit record;
  v_current_hour int;
  v_window_start timestamptz;
  v_max_per_window int := 10; -- Max 10 notifications per 5-minute window
BEGIN
  -- Check user preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, allow (default behavior)
  IF v_prefs IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if push is globally disabled
  IF NOT v_prefs.push_enabled THEN
    RETURN false;
  END IF;
  
  -- Check type-specific preferences
  IF p_notification_type = 'like' AND NOT v_prefs.likes_enabled THEN
    RETURN false;
  ELSIF p_notification_type = 'comment' AND NOT v_prefs.comments_enabled THEN
    RETURN false;
  ELSIF p_notification_type = 'reply' AND NOT v_prefs.replies_enabled THEN
    RETURN false;
  ELSIF p_notification_type = 'follow' AND NOT v_prefs.follows_enabled THEN
    RETURN false;
  ELSIF p_notification_type = 'mention' AND NOT v_prefs.mentions_enabled THEN
    RETURN false;
  END IF;
  
  -- Check quiet hours
  IF v_prefs.quiet_hours_start IS NOT NULL AND v_prefs.quiet_hours_end IS NOT NULL THEN
    v_current_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC');
    
    IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
      -- Normal range (e.g., 22:00 to 08:00)
      IF v_current_hour >= v_prefs.quiet_hours_start AND v_current_hour < v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    ELSE
      -- Wraps midnight (e.g., 22:00 to 08:00)
      IF v_current_hour >= v_prefs.quiet_hours_start OR v_current_hour < v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  -- Check rate limiting (5-minute windows)
  v_window_start := date_trunc('minute', now()) - (EXTRACT(MINUTE FROM now())::int % 5) * interval '1 minute';
  
  SELECT * INTO v_rate_limit
  FROM notification_rate_limits
  WHERE user_id = p_user_id
    AND notification_type = p_notification_type
    AND window_start = v_window_start;
  
  IF v_rate_limit IS NOT NULL AND v_rate_limit.count >= v_max_per_window THEN
    RETURN false;
  END IF;
  
  -- Update rate limit counter
  INSERT INTO notification_rate_limits (user_id, notification_type, window_start, count, last_sent_at)
  VALUES (p_user_id, p_notification_type, v_window_start, 1, now())
  ON CONFLICT (user_id, notification_type, window_start)
  DO UPDATE SET 
    count = notification_rate_limits.count + 1,
    last_sent_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification with batching support
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_actor_user_id uuid,
  p_post_id uuid DEFAULT NULL,
  p_comment_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_message text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
  v_batch_key text;
  v_existing_notification record;
  v_actor_name text;
  v_final_title text;
  v_final_message text;
BEGIN
  -- Don't notify if actor is the same as recipient
  IF p_actor_user_id = p_user_id THEN
    RETURN NULL;
  END IF;
  
  -- Get actor's display name
  SELECT display_name INTO v_actor_name
  FROM profiles
  WHERE id = p_actor_user_id;
  
  -- Generate batch key for similar notifications
  v_batch_key := p_user_id::text || '_' || p_type || '_' || COALESCE(p_post_id::text, '');
  
  -- Check if there's a recent similar notification (within last 5 minutes)
  SELECT * INTO v_existing_notification
  FROM notifications
  WHERE batch_key = v_batch_key
    AND created_at > now() - interval '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If exists, update batch count instead of creating new
  IF v_existing_notification IS NOT NULL THEN
    UPDATE notifications
    SET 
      batch_count = batch_count + 1,
      is_batched = true,
      message = CASE
        WHEN p_type = 'like' THEN v_actor_name || ' and ' || batch_count || ' others liked your post'
        WHEN p_type = 'comment' THEN v_actor_name || ' and ' || batch_count || ' others commented on your post'
        ELSE message
      END,
      updated_at = now()
    WHERE id = v_existing_notification.id;
    
    RETURN v_existing_notification.id;
  END IF;
  
  -- Generate title and message if not provided
  v_final_title := COALESCE(p_title, 'LastBench');
  v_final_message := COALESCE(p_message,
    CASE p_type
      WHEN 'like' THEN v_actor_name || ' liked your post'
      WHEN 'comment' THEN v_actor_name || ' commented on your post'
      WHEN 'reply' THEN v_actor_name || ' replied to your comment'
      WHEN 'follow' THEN v_actor_name || ' started following you'
      WHEN 'mention' THEN v_actor_name || ' mentioned you in a post'
      ELSE 'You have a new notification'
    END
  );
  
  -- Create new notification
  INSERT INTO notifications (
    user_id,
    type,
    actor_user_id,
    post_id,
    comment_id,
    title,
    message,
    data,
    batch_key
  ) VALUES (
    p_user_id,
    p_type,
    p_actor_user_id,
    p_post_id,
    p_comment_id,
    v_final_title,
    v_final_message,
    p_data,
    v_batch_key
  )
  ON CONFLICT (user_id, type, actor_user_id, post_id, comment_id)
  DO UPDATE SET
    created_at = now(),
    is_read = false
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. DATABASE TRIGGERS FOR AUTO-NOTIFICATIONS
-- ============================================================================

-- Trigger: When someone likes a post
CREATE OR REPLACE FUNCTION trigger_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  -- Only for 'like' interactions
  IF NEW.type != 'like' THEN
    RETURN NEW;
  END IF;
  
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user liked their own post
  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Check if should send notification
  IF should_send_notification(v_post_author_id, 'like') THEN
    PERFORM create_notification(
      p_user_id := v_post_author_id,
      p_type := 'like',
      p_actor_user_id := NEW.user_id,
      p_post_id := NEW.post_id,
      p_data := jsonb_build_object('postId', NEW.post_id, 'userId', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_interaction_like ON interactions;
CREATE TRIGGER on_interaction_like
AFTER INSERT ON interactions
FOR EACH ROW
EXECUTE FUNCTION trigger_like_notification();

-- Trigger: When someone comments on a post
CREATE OR REPLACE FUNCTION trigger_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  -- Get post author
  SELECT author_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user commented on their own post
  IF v_post_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;
  
  -- Check if should send notification
  IF should_send_notification(v_post_author_id, 'comment') THEN
    PERFORM create_notification(
      p_user_id := v_post_author_id,
      p_type := 'comment',
      p_actor_user_id := NEW.author_id,
      p_post_id := NEW.post_id,
      p_comment_id := NEW.id,
      p_data := jsonb_build_object('postId', NEW.post_id, 'commentId', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_created ON comments;
CREATE TRIGGER on_comment_created
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION trigger_comment_notification();

-- Trigger: When someone follows a user (if you have a follows table)
-- Uncomment and adjust if you have a follows feature
/*
CREATE OR REPLACE FUNCTION trigger_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF should_send_notification(NEW.followed_user_id, 'follow') THEN
    PERFORM create_notification(
      p_user_id := NEW.followed_user_id,
      p_type := 'follow',
      p_actor_user_id := NEW.follower_user_id,
      p_data := jsonb_build_object('userId', NEW.follower_user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_followed ON follows;
CREATE TRIGGER on_user_followed
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION trigger_follow_notification();
*/

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all notification tables
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own FCM tokens
CREATE POLICY "Users can manage their own FCM tokens"
ON fcm_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only read their own notifications
CREATE POLICY "Users can read their own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage their own preferences"
ON notification_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE fcm_tokens;

-- ============================================================================
-- 9. CLEANUP JOBS (Run periodically via pg_cron or external scheduler)
-- ============================================================================

-- Clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - interval '30 days';
  
  DELETE FROM notification_rate_limits
  WHERE window_start < now() - interval '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. INITIAL DATA
-- ============================================================================

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- DEPLOYMENT VERIFICATION
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'fcm_tokens') = 1, 'fcm_tokens table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notifications') = 1, 'notifications table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notification_preferences') = 1, 'notification_preferences table not created';
  RAISE NOTICE '✅ All notification tables created successfully';
END $$;
