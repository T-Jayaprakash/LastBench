-- Performance Optimization Indexes for LastBench App
-- Run this in your Supabase SQL Editor to improve query performance

-- 1. Index on posts.college (for filtering posts by college)
CREATE INDEX IF NOT EXISTS idx_posts_college ON posts(college);

-- 2. Composite index on posts (college + created_at) for the main feed query
-- This is the most important index for the slow query
CREATE INDEX IF NOT EXISTS idx_posts_college_created_at ON posts(college, created_at DESC);

-- 3. Index on posts.created_at for ordering
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- 4. Index on profiles.college (for legacy queries)
CREATE INDEX IF NOT EXISTS idx_profiles_college ON profiles(college);

-- 5. Index on profiles.id (for joins - usually already exists as primary key, but ensure it's there)
-- This should already exist, but adding for completeness
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- 6. Index on interactions for faster like lookups
-- Optimized for: WHERE user_id = X AND type = 'like' AND post_id IN (...)
CREATE INDEX IF NOT EXISTS idx_interactions_user_type_post ON interactions(user_id, type, post_id);

-- 7. Index on interactions.post_id for faster post lookups
CREATE INDEX IF NOT EXISTS idx_interactions_post_id ON interactions(post_id);

-- 8. Index on posts.author_id for profile joins
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);

-- 9. Index on profiles.anon_id for user post queries
CREATE INDEX IF NOT EXISTS idx_profiles_anon_id ON profiles(anon_id);

-- 10. Index on comments.post_id for fetching comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- 11. Index on notifications.user_id for fetching notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);

-- Analyze tables to update statistics (helps query planner)
ANALYZE posts;
ANALYZE profiles;
ANALYZE interactions;
ANALYZE comments;
ANALYZE notifications;
