# Antigravity Egress Optimization Report

**Status:** Implemented in branch `antigravity/egress-optimization`.

## Summary of Changes
1. **Frontend Hook (`useFeed`)**: 
   - Replaced potentially inefficient fetching with a **paginated** solution (Page Size: 10).
   - Implemented **LocalStorage Caching** for instant feed load on revisit.
   - Switched to **RPC-based fetching** (`get_posts_paginated`) to fetch only necessary columns, avoiding `select(*)` and heavy joins.
   - Implemented **Lightweight Realtime** via `feed_events` table. The server emits a tiny `{ post_id }` signal, and the client fetches the single post via RPC.

2. **UI Optimization (`LazyImage`, `Feed`)**:
   - Created `LazyImage.tsx` which handles `loading="lazy"` and supports a low-res placeholder (`thumb_path`) for a blur-up effect.
   - Created `Feed.tsx` as a drop-in replacement for the feed list logic.

3. **Database Optimization**:
   - **Indexes**: Added composite indexes on `(college, created_at)` and `(user_id, type, post_id)` to speed up filtering.
   - **RPCs**: Created `get_posts_paginated` and `get_post_by_id` to encapsulate complex logic and reduce network payload.
   - **Triggers**: Created a trigger on `posts` to populate the lightweight `feed_events` table.

4. **Thumbnail Strategy**:
   - Provided `server/thumbnail-generator`: A Node.js + Sharp function to generate WebP thumbnails.
   - Updated `PostCard` to use `thumb_path` if available.

## Deployment & Verification

### 1. Database Migration
Run the contents of `sql/antigravity_indexes_and_rpcs.sql` in your Supabase SQL Editor.
This creates the necessary RPCs, Indexes, and the `feed_events` table.

### 2. Thumbnail Service (Optional but Recommended)
Deploy the code in `server/thumbnail-generator` to a cloud function (AWS/GCP/Supabase Edge Function) and set up a database webhook on `posts` (INSERT) to trigger it. This will ensure `thumb_path` is populated.

### 3. Testing
Run the smoke test to verify RPCs and pagination:
```bash
node tests/egress_smoke_test.js
```

## Egress Reduction Estimates
- **Feed Fetch:** Reduced from `SELECT *` (potentially large JSON) to specific columns. Saved **~40-60%** per row.
- **Pagination:** Strict limit of 10 items vs open-ended or large batches. Saved **~80%** on initial load (compared to 50 items).
- **Realtime:** Reduced from full row payload to `{ post_id }`. Saved **~95%** bandwidth on notifications.
- **Images:** WebP thumbnails (~20KB) vs Full JS/PNG (~500KB+). Saved **~90%** bandwidth per image in feed.

## Rollback Plan
1. Revert the git merge.
2. The SQL changes (indexes, RPCs) are additive and generally safe to leave, but can be dropped if desired.
3. Disable the `feed_events` trigger: `DROP TRIGGER on_post_created ON posts;`.

