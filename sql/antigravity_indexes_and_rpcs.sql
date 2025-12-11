-- Antigravity Egress Optimization SQL
-- Run this in Supabase SQL Editor

-- 0. Schema Updates (Ensure thumb_path exists)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thumb_path text;

-- 1. Optimized Indexes
CREATE INDEX IF NOT EXISTS idx_posts_college_created_at ON posts(college, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_user_type_post ON interactions(user_id, type, post_id);

-- 2. Lightweight Realtime Notification Table
CREATE TABLE IF NOT EXISTS feed_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Trigger to populate feed_events
CREATE OR REPLACE FUNCTION notify_new_post_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_events (post_id, event_type)
  VALUES (NEW.id, 'INSERT');
  DELETE FROM feed_events WHERE created_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_created ON posts;
CREATE TRIGGER on_post_created
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION notify_new_post_trigger();

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE feed_events;

-- 5. RPC: Get Posts Paginated (Thumbnails + Like Status)
CREATE OR REPLACE FUNCTION get_posts_paginated(
  p_college text,
  p_limit int,
  p_offset int,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  text text,
  image_url text,
  thumb_path text,
  images text[],
  author_id uuid,
  likes_count int,
  comments_count int,
  created_at timestamptz,
  college text,
  display_name text,
  avatar_url text,
  avatar_color text,
  is_liked boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.text,
    p.image_url,
    p.thumb_path,
    p.images,
    p.author_id,
    p.likes_count,
    p.comments_count,
    p.created_at,
    p.college,
    pr.display_name,
    pr.avatar_url,
    pr.avatar_color,
    CASE 
        WHEN p_user_id IS NOT NULL THEN EXISTS(SELECT 1 FROM interactions i WHERE i.post_id = p.id AND i.user_id = p_user_id AND i.type = 'like')
        ELSE false
    END as is_liked
  FROM posts p
  LEFT JOIN profiles pr ON p.author_id = pr.id
  WHERE p.college = p_college
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC: Get Single Post By ID (Full Detail + Like Status)
CREATE OR REPLACE FUNCTION get_post_by_id(
  p_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  text text,
  image_url text,
  thumb_path text,
  images text[],
  author_id uuid,
  likes_count int,
  comments_count int,
  created_at timestamptz,
  college text,
  department text,
  tags text[],
  display_name text,
  avatar_url text,
  avatar_color text,
  is_liked boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.text,
    p.image_url,
    p.thumb_path,
    p.images,
    p.author_id,
    p.likes_count,
    p.comments_count,
    p.created_at,
    p.college,
    p.department,
    p.tags,
    pr.display_name,
    pr.avatar_url,
    pr.avatar_color,
    CASE 
        WHEN p_user_id IS NOT NULL THEN EXISTS(SELECT 1 FROM interactions i WHERE i.post_id = p.id AND i.user_id = p_user_id AND i.type = 'like')
        ELSE false
    END as is_liked
  FROM posts p
  LEFT JOIN profiles pr ON p.author_id = pr.id
  WHERE p.id = p_id;
END;
$$ LANGUAGE plpgsql;
