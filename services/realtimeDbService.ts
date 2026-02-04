/**
 * ============================================================================
 * REALTIME DATABASE SERVICE - Firebase Realtime Database Operations
 * ============================================================================
 * 
 * Replaces Firestore with Firebase Realtime Database for simpler permissions
 * and better real-time synchronization.
 * 
 * Database Structure:
 * /profiles/{userId} - User profiles
 * /posts/{postId} - Posts
 * /comments/{commentId} - Comments
 * /interactions/{interactionId} - Likes/interactions
 * /notifications/{userId}/{notificationId} - User notifications
 * 
 * ============================================================================
 */

import {
    ref,
    get,
    set,
    push,
    update,
    remove,
    query as rtdbQuery,
    orderByChild,
    equalTo,
    limitToLast,
    limitToFirst,
    onValue,
    off,
    serverTimestamp as rtdbServerTimestamp,
    DatabaseReference,
    DataSnapshot
} from 'firebase/database';
import { rtdb, auth } from './firebase';
import { Post, Comment, PostTag, User } from '../types/index';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_PATHS = {
    PROFILES: 'profiles',
    POSTS: 'posts',
    COMMENTS: 'comments',
    INTERACTIONS: 'interactions',
    NOTIFICATIONS: 'notifications',
    COLLEGES: 'colleges', // Index for college-based queries
} as const;

const PAGE_SIZE = 20;
const FEED_CACHE_KEY = 'genfess_feed_cache_v3';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current user ID from Firebase Auth
 */
const getCurrentUserId = (): string | null => {
    return auth.currentUser?.uid || null;
};

/**
 * Generate a unique ID (similar to push key but deterministic for interactions)
 */
const generateInteractionId = (userId: string, targetId: string, type: string): string => {
    return `${userId}_${type}_${targetId}`;
};

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

/**
 * Save user profile to Realtime Database
 */
export const saveProfile = async (userId: string, profileData: any): Promise<boolean> => {
    try {
        const profileRef = ref(rtdb, `${DB_PATHS.PROFILES}/${userId}`);

        const dataToSave = {
            ...profileData,
            updated_at: rtdbServerTimestamp(),
        };

        // Check if profile exists
        const snapshot = await get(profileRef);
        if (!snapshot.exists()) {
            dataToSave.created_at = rtdbServerTimestamp();
        }

        await set(profileRef, dataToSave);
        console.log('✅ Profile saved to Realtime DB:', userId);
        return true;
    } catch (error) {
        console.error('❌ saveProfile error:', error);
        throw error;
    }
};

/**
 * Get user profile from Realtime Database
 */
export const getProfile = async (userId: string): Promise<any | null> => {
    try {
        const profileRef = ref(rtdb, `${DB_PATHS.PROFILES}/${userId}`);
        const snapshot = await get(profileRef);

        if (snapshot.exists()) {
            return { id: userId, ...snapshot.val() };
        }
        return null;
    } catch (error) {
        console.error('❌ getProfile error:', error);
        return null;
    }
};

/**
 * Update user profile
 */
export const updateProfile = async (userId: string, updates: Partial<any>): Promise<boolean> => {
    try {
        const profileRef = ref(rtdb, `${DB_PATHS.PROFILES}/${userId}`);
        await update(profileRef, {
            ...updates,
            updated_at: rtdbServerTimestamp(),
        });
        return true;
    } catch (error) {
        console.error('❌ updateProfile error:', error);
        return false;
    }
};

// ============================================================================
// POST OPERATIONS
// ============================================================================

/**
 * Map database data to Post type
 */
const mapDataToPost = (id: string, data: any): Post => {
    let images: string[] = data.images || [];
    let mainImageUrl = data.image_url;

    if (images.length === 0 && mainImageUrl && typeof mainImageUrl === 'string') {
        images = [mainImageUrl];
    }

    return {
        id,
        authorAnonId: data.author_anon_id || 'Unknown',
        displayName: data.display_name || 'Anonymous',
        authorAvatarColor: data.avatar_color || '#ccc',
        authorAvatarUrl: data.avatar_url,
        text: data.text || '',
        imageUrl: mainImageUrl,
        thumbPath: data.thumb_path,
        images: images,
        department: data.department,
        college: data.college,
        tags: data.tags || [],
        likesCount: data.likes_count || 0,
        commentsCount: data.comments_count || 0,
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        trendingScore: (data.likes_count || 0) + ((data.comments_count || 0) * 2),
        isLiked: false,
    };
};

/**
 * Create a new post
 */
export const createPost = async (postData: {
    text: string;
    images?: string[];
    tags: PostTag[];
    user: User;
}): Promise<Post | null> => {
    try {
        const { text, images, tags, user } = postData;

        if (!user) {
            throw new Error('User not authenticated');
        }

        const postsRef = ref(rtdb, DB_PATHS.POSTS);
        const newPostRef = push(postsRef);
        const postId = newPostRef.key!;

        const timestamp = Date.now();

        const post = {
            author_id: user.userId,
            author_anon_id: user.anonId,
            display_name: user.displayName,
            avatar_color: user.avatarColor,
            avatar_url: user.avatarUrl || null,
            text,
            tags: tags || [],
            images: images || [],
            image_url: images?.[0] || null,
            department: user.department || 'Other',
            college: user.college || 'Unknown',
            likes_count: 0,
            comments_count: 0,
            created_at: timestamp,
            created_at_negative: -timestamp, // For reverse ordering
        };

        await set(newPostRef, post);

        // Add to college index for efficient querying
        const collegeIndexRef = ref(rtdb, `${DB_PATHS.COLLEGES}/${encodeCollegeName(user.college)}/${postId}`);
        await set(collegeIndexRef, {
            created_at: timestamp,
            created_at_negative: -timestamp,
        });

        console.log('✅ Post created:', postId);

        return mapDataToPost(postId, post);
    } catch (error) {
        console.error('❌ createPost error:', error);
        return null;
    }
};

/**
 * Encode college name for use as database key
 */
const encodeCollegeName = (name: string): string => {
    return (name || 'unknown').replace(/[.#$[\]]/g, '_').toLowerCase();
};

/**
 * Get posts for a college
 */
export const getPosts = async (college: string, limitCount = PAGE_SIZE): Promise<Post[]> => {
    try {
        const collegeKey = encodeCollegeName(college);
        const collegeIndexRef = ref(rtdb, `${DB_PATHS.COLLEGES}/${collegeKey}`);

        // Query the index ordered by created_at_negative for newest first
        const indexQuery = rtdbQuery(
            collegeIndexRef,
            orderByChild('created_at_negative'),
            limitToFirst(limitCount)
        );

        const indexSnapshot = await get(indexQuery);

        if (!indexSnapshot.exists()) {
            console.log('📭 No posts found for college:', college);
            return [];
        }

        // Get post IDs from index
        const postIds: string[] = [];
        indexSnapshot.forEach((child) => {
            postIds.push(child.key!);
        });

        // Fetch actual posts
        const posts: Post[] = [];
        for (const postId of postIds) {
            const postRef = ref(rtdb, `${DB_PATHS.POSTS}/${postId}`);
            const postSnapshot = await get(postRef);
            if (postSnapshot.exists()) {
                posts.push(mapDataToPost(postId, postSnapshot.val()));
            }
        }

        // Check if user has liked posts
        const userId = getCurrentUserId();
        if (userId && posts.length > 0) {
            const likedPostIds = await getUserLikedPostIds(userId, posts.map(p => p.id));
            posts.forEach(post => {
                post.isLiked = likedPostIds.has(post.id);
            });
        }

        console.log(`📨 Fetched ${posts.length} posts for ${college}`);
        return posts;
    } catch (error) {
        console.error('❌ getPosts error:', error);
        return [];
    }
};

/**
 * Get a single post by ID
 */
export const getPostById = async (postId: string): Promise<Post | null> => {
    try {
        const postRef = ref(rtdb, `${DB_PATHS.POSTS}/${postId}`);
        const snapshot = await get(postRef);

        if (!snapshot.exists()) return null;

        const post = mapDataToPost(postId, snapshot.val());

        // Check if current user has liked this post
        const userId = getCurrentUserId();
        if (userId) {
            const likedPostIds = await getUserLikedPostIds(userId, [postId]);
            post.isLiked = likedPostIds.has(postId);
        }

        return post;
    } catch (error) {
        console.error('❌ getPostById error:', error);
        return null;
    }
};

/**
 * Update a post
 */
export const updatePost = async (postId: string, text: string): Promise<boolean> => {
    try {
        const userId = getCurrentUserId();
        if (!userId) return false;

        const postRef = ref(rtdb, `${DB_PATHS.POSTS}/${postId}`);
        const snapshot = await get(postRef);

        if (!snapshot.exists()) return false;
        if (snapshot.val().author_id !== userId) return false;

        await update(postRef, {
            text,
            is_edited: true,
            updated_at: rtdbServerTimestamp(),
        });

        return true;
    } catch (error) {
        console.error('❌ updatePost error:', error);
        return false;
    }
};

/**
 * Delete a post
 */
export const deletePost = async (postId: string): Promise<boolean> => {
    try {
        const userId = getCurrentUserId();
        if (!userId) return false;

        const postRef = ref(rtdb, `${DB_PATHS.POSTS}/${postId}`);
        const snapshot = await get(postRef);

        if (!snapshot.exists()) return true; // Already deleted

        const postData = snapshot.val();
        if (postData.author_id !== userId) return false;

        // Remove from college index
        const collegeKey = encodeCollegeName(postData.college);
        const collegeIndexRef = ref(rtdb, `${DB_PATHS.COLLEGES}/${collegeKey}/${postId}`);
        await remove(collegeIndexRef);

        // Remove the post
        await remove(postRef);

        console.log('✅ Post deleted:', postId);
        return true;
    } catch (error) {
        console.error('❌ deletePost error:', error);
        return false;
    }
};

// ============================================================================
// INTERACTION OPERATIONS (LIKES)
// ============================================================================

/**
 * Get post IDs that user has liked
 */
export const getUserLikedPostIds = async (userId: string, postIds: string[]): Promise<Set<string>> => {
    try {
        const likedIds = new Set<string>();

        for (const postId of postIds) {
            const interactionId = generateInteractionId(userId, postId, 'like_post');
            const interactionRef = ref(rtdb, `${DB_PATHS.INTERACTIONS}/${interactionId}`);
            const snapshot = await get(interactionRef);
            if (snapshot.exists()) {
                likedIds.add(postId);
            }
        }

        return likedIds;
    } catch (error) {
        console.error('❌ getUserLikedPostIds error:', error);
        return new Set();
    }
};

/**
 * Toggle like on a post
 */
export const toggleLike = async (postId: string): Promise<{ liked: boolean; count: number }> => {
    try {
        const userId = getCurrentUserId();
        if (!userId) throw new Error('User not authenticated');

        const interactionId = generateInteractionId(userId, postId, 'like_post');
        const interactionRef = ref(rtdb, `${DB_PATHS.INTERACTIONS}/${interactionId}`);
        const postRef = ref(rtdb, `${DB_PATHS.POSTS}/${postId}`);

        const [interactionSnap, postSnap] = await Promise.all([
            get(interactionRef),
            get(postRef)
        ]);

        if (!postSnap.exists()) throw new Error('Post not found');

        const currentCount = postSnap.val().likes_count || 0;
        let newCount: number;
        let liked: boolean;

        if (interactionSnap.exists()) {
            // Unlike
            await remove(interactionRef);
            newCount = Math.max(0, currentCount - 1);
            liked = false;
            console.log('👎 Unliked post:', postId);
        } else {
            // Like
            await set(interactionRef, {
                user_id: userId,
                post_id: postId,
                type: 'like_post',
                created_at: rtdbServerTimestamp(),
            });
            newCount = currentCount + 1;
            liked = true;
            console.log('👍 Liked post:', postId);
        }

        // Update post like count
        await update(postRef, { likes_count: newCount });

        return { liked, count: newCount };
    } catch (error) {
        console.error('❌ toggleLike error:', error);
        throw error;
    }
};

// ============================================================================
// COMMENT OPERATIONS
// ============================================================================

/**
 * Map database data to Comment type
 */
const mapDataToComment = (id: string, data: any): Comment => {
    return {
        id,
        postId: data.post_id,
        parentId: data.parent_id || null,
        authorAnonId: data.author_anon_id || 'Unknown',
        displayName: data.display_name || 'Anonymous',
        authorAvatarColor: data.avatar_color || '#ccc',
        authorAvatarUrl: data.avatar_url,
        text: data.text,
        likesCount: data.likes_count || 0,
        isLiked: false,
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    };
};

/**
 * Get comments for a post
 */
export const getComments = async (postId: string): Promise<Comment[]> => {
    try {
        const commentsRef = ref(rtdb, DB_PATHS.COMMENTS);

        // We'll fetch all comments and filter by post_id
        // In production, you'd want to index by post_id
        const snapshot = await get(commentsRef);

        if (!snapshot.exists()) return [];

        const comments: Comment[] = [];
        snapshot.forEach((child) => {
            const data = child.val();
            if (data.post_id === postId) {
                comments.push(mapDataToComment(child.key!, data));
            }
        });

        // Sort by created_at ascending
        comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        return comments;
    } catch (error) {
        console.error('❌ getComments error:', error);
        return [];
    }
};

/**
 * Add a comment
 */
export const addComment = async (
    postId: string,
    text: string,
    user: User,
    parentId?: string
): Promise<Comment | null> => {
    try {
        if (!user) throw new Error('User not authenticated');

        const commentsRef = ref(rtdb, DB_PATHS.COMMENTS);
        const newCommentRef = push(commentsRef);
        const commentId = newCommentRef.key!;

        const timestamp = Date.now();

        const commentData = {
            post_id: postId,
            parent_id: parentId || null,
            author_id: user.userId,
            author_anon_id: user.anonId,
            display_name: user.displayName,
            avatar_color: user.avatarColor,
            avatar_url: user.avatarUrl || null,
            text,
            likes_count: 0,
            created_at: timestamp,
        };

        await set(newCommentRef, commentData);

        // Increment comment count on post
        const postRef = ref(rtdb, `${DB_PATHS.POSTS}/${postId}`);
        const postSnap = await get(postRef);
        if (postSnap.exists()) {
            const currentCount = postSnap.val().comments_count || 0;
            await update(postRef, { comments_count: currentCount + 1 });
        }

        console.log('✅ Comment added:', commentId);

        return mapDataToComment(commentId, commentData);
    } catch (error) {
        console.error('❌ addComment error:', error);
        return null;
    }
};

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to posts for a college
 */
export const subscribeToCollegePosts = (
    college: string,
    callback: (posts: Post[]) => void
): (() => void) => {
    const collegeKey = encodeCollegeName(college);
    const collegeIndexRef = ref(rtdb, `${DB_PATHS.COLLEGES}/${collegeKey}`);

    const unsubscribe = onValue(collegeIndexRef, async (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }

        const postIds: string[] = [];
        snapshot.forEach((child) => {
            postIds.push(child.key!);
        });

        // Fetch posts
        const posts: Post[] = [];
        for (const postId of postIds) {
            const postRef = ref(rtdb, `${DB_PATHS.POSTS}/${postId}`);
            const postSnapshot = await get(postRef);
            if (postSnapshot.exists()) {
                posts.push(mapDataToPost(postId, postSnapshot.val()));
            }
        }

        // Sort by date descending
        posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        callback(posts);
    });

    return () => off(collegeIndexRef);
};

/**
 * Subscribe to a single post
 */
export const subscribeToPost = (
    postId: string,
    callback: (post: Post | null) => void
): (() => void) => {
    const postRef = ref(rtdb, `${DB_PATHS.POSTS}/${postId}`);

    const unsubscribe = onValue(postRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }
        callback(mapDataToPost(postId, snapshot.val()));
    });

    return () => off(postRef);
};

// ============================================================================
// NOTIFICATION OPERATIONS
// ============================================================================

/**
 * Create a notification
 */
export const createNotification = async (
    userId: string,
    type: string,
    data: any
): Promise<boolean> => {
    try {
        const notificationsRef = ref(rtdb, `${DB_PATHS.NOTIFICATIONS}/${userId}`);
        const newNotificationRef = push(notificationsRef);

        await set(newNotificationRef, {
            type,
            ...data,
            read: false,
            created_at: rtdbServerTimestamp(),
        });

        return true;
    } catch (error) {
        console.error('❌ createNotification error:', error);
        return false;
    }
};

/**
 * Get notifications for a user
 */
export const getNotifications = async (userId: string): Promise<any[]> => {
    try {
        const notificationsRef = ref(rtdb, `${DB_PATHS.NOTIFICATIONS}/${userId}`);
        const snapshot = await get(notificationsRef);

        if (!snapshot.exists()) return [];

        const notifications: any[] = [];
        snapshot.forEach((child) => {
            notifications.push({
                id: child.key,
                ...child.val(),
            });
        });

        // Sort by date descending
        notifications.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

        return notifications;
    } catch (error) {
        console.error('❌ getNotifications error:', error);
        return [];
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get existing colleges for autocomplete
 */
export const getExistingColleges = async (): Promise<string[]> => {
    try {
        const collegesRef = ref(rtdb, DB_PATHS.COLLEGES);
        const snapshot = await get(collegesRef);

        if (!snapshot.exists()) return [];

        const colleges: string[] = [];
        snapshot.forEach((child) => {
            // Decode the college name from the key
            colleges.push(child.key!.replace(/_/g, ' ').toUpperCase());
        });

        return colleges;
    } catch (error) {
        console.error('❌ getExistingColleges error:', error);
        return [];
    }
};

/**
 * Get user posts by anon ID
 */
export const getUserPosts = async (anonId: string): Promise<Post[]> => {
    try {
        const postsRef = ref(rtdb, DB_PATHS.POSTS);
        const snapshot = await get(postsRef);

        if (!snapshot.exists()) return [];

        const posts: Post[] = [];
        snapshot.forEach((child) => {
            const data = child.val();
            if (data.author_anon_id === anonId) {
                posts.push(mapDataToPost(child.key!, data));
            }
        });

        // Sort by date descending
        posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return posts;
    } catch (error) {
        console.error('❌ getUserPosts error:', error);
        return [];
    }
};

/**
 * Get cache (compatibility with existing code)
 */
export const getCachedPosts = (): Post[] => {
    try {
        const cached = localStorage.getItem(FEED_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            return parsed.map((p: any) => ({
                ...p,
                createdAt: new Date(p.createdAt)
            }));
        }
    } catch (e) {
        localStorage.removeItem(FEED_CACHE_KEY);
    }
    return [];
};

/**
 * Save posts to cache
 */
export const cachePosts = (posts: Post[]): void => {
    try {
        localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(posts.slice(0, PAGE_SIZE)));
    } catch (e) {
        console.warn('Cache save failed');
    }
};
