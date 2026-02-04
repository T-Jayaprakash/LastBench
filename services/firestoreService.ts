/**
 * ============================================================================
 * FIRESTORE SERVICE - Production-Grade Database Operations
 * ============================================================================
 * 
 * Core database service for GenFess - replaces all Supabase operations
 * Designed for production Play Store release
 * 
 * Features:
 * - Full CRUD for posts, comments, interactions
 * - Real-time subscriptions for live updates
 * - Optimistic UI patterns for instant feedback
 * - Offline support with Firestore persistence
 * - Batch operations for efficiency
 * - Indexes for performant queries
 * 
 * ============================================================================
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    increment,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    writeBatch,
    DocumentData,
    QueryDocumentSnapshot,
    QueryConstraint,
    runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { Post, Comment, PostTag, User } from '../types/index';
import { getCurrentUser } from './userService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const COLLECTIONS = {
    POSTS: 'posts',
    COMMENTS: 'comments',
    INTERACTIONS: 'interactions',
    PROFILES: 'profiles',
    NOTIFICATIONS: 'notifications',
    REPORTS: 'reports',
} as const;

const PAGE_SIZE = 20;
const FEED_CACHE_KEY = 'genfess_feed_cache_v2';

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

/**
 * Map Firestore document to Post type
 */
export const mapDocToPost = (doc: QueryDocumentSnapshot<DocumentData>): Post => {
    const data = doc.data();

    // Handle images array
    let images: string[] = data.images || [];
    let mainImageUrl = data.image_url;

    if (images.length === 0 && mainImageUrl && typeof mainImageUrl === 'string') {
        if (mainImageUrl.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(mainImageUrl);
                if (Array.isArray(parsed)) {
                    images = parsed;
                    mainImageUrl = parsed[0];
                }
            } catch (e) {
                images = [mainImageUrl];
            }
        } else {
            images = [mainImageUrl];
        }
    }

    return {
        id: doc.id,
        authorAnonId: data.author_anon_id || 'Unknown',
        displayName: data.display_name || data.author_name || 'Anonymous',
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
        createdAt: data.created_at?.toDate?.() || new Date(data.created_at) || new Date(),
        trendingScore: (data.likes_count || 0) + ((data.comments_count || 0) * 2),
        isLiked: false, // Will be set separately after checking interactions
    };
};

/**
 * Map Firestore document to Comment type
 */
const mapDocToComment = (doc: QueryDocumentSnapshot<DocumentData>): Comment => {
    const data = doc.data();

    return {
        id: doc.id,
        postId: data.post_id,
        parentId: data.parent_id || null,
        authorAnonId: data.author_anon_id || 'Unknown',
        displayName: data.display_name || 'Anonymous',
        authorAvatarColor: data.avatar_color || '#ccc',
        authorAvatarUrl: data.avatar_url,
        text: data.text,
        likesCount: data.likes_count || 0,
        isLiked: false,
        createdAt: data.created_at?.toDate?.() || new Date(data.created_at) || new Date(),
    };
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Get cached posts from localStorage
 */
export const getCachedPosts = (): Post[] => {
    try {
        const cached = localStorage.getItem(FEED_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            const posts = parsed.map((p: any) => ({
                ...p,
                createdAt: new Date(p.createdAt)
            }));
            console.log(`📦 Loaded ${posts.length} posts from cache`);
            return posts;
        }
    } catch (e) {
        console.error("Cache parse error", e);
        try {
            localStorage.removeItem(FEED_CACHE_KEY);
        } catch { }
    }
    return [];
};

/**
 * Save posts to cache
 */
const cacheFirstPage = (posts: Post[]) => {
    try {
        localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(posts.slice(0, PAGE_SIZE)));
    } catch (e) {
        console.warn("Cache save failed", e);
    }
};

// ============================================================================
// POSTS - READ OPERATIONS
// ============================================================================

/**
 * Fetch paginated posts for a college
 */
export const getPosts = async (page = 0, limitCount = PAGE_SIZE, lastDoc?: any): Promise<{ posts: Post[], lastDoc: any }> => {
    try {
        const user = await getCurrentUser();
        if (!user || !user.college) {
            console.warn('getPosts: No user or college');
            return { posts: [], lastDoc: null };
        }

        const userCollege = user.college.trim();
        const postsRef = collection(db, COLLECTIONS.POSTS);

        const constraints: QueryConstraint[] = [
            where('college', '==', userCollege),
            orderBy('created_at', 'desc'),
            limit(limitCount)
        ];

        if (lastDoc) {
            constraints.push(startAfter(lastDoc));
        }

        const q = query(postsRef, ...constraints);
        const snapshot = await getDocs(q);

        const posts: Post[] = snapshot.docs.map(mapDocToPost);
        const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

        // Check if user has liked any of these posts
        if (user && posts.length > 0) {
            const postIds = posts.map(p => p.id);
            const likedPostIds = await getUserLikedPostIds(user.userId, postIds);
            posts.forEach(post => {
                post.isLiked = likedPostIds.has(post.id);
            });
        }

        // Cache first page
        if (page === 0 && posts.length > 0) {
            cacheFirstPage(posts);
        }

        console.log(`📨 Fetched ${posts.length} posts for ${userCollege}`);
        return { posts, lastDoc: newLastDoc };
    } catch (err) {
        console.error("getPosts error:", err);
        return { posts: [], lastDoc: null };
    }
};

/**
 * Get a single post by ID
 */
export const getPostById = async (postId: string): Promise<Post | null> => {
    try {
        const docRef = doc(db, COLLECTIONS.POSTS, postId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return null;

        const post = mapDocToPost(docSnap as any);

        // Check if current user has liked this post
        const user = await getCurrentUser();
        if (user) {
            const likedPostIds = await getUserLikedPostIds(user.userId, [postId]);
            post.isLiked = likedPostIds.has(postId);
        }

        return post;
    } catch (e) {
        console.error("getPostById error:", e);
        return null;
    }
};

/**
 * Get posts by a specific user (by their anon ID)
 */
export const getUserPosts = async (anonId: string): Promise<Post[]> => {
    try {
        const user = await getCurrentUser();
        const postsRef = collection(db, COLLECTIONS.POSTS);

        const q = query(
            postsRef,
            where('author_anon_id', '==', anonId),
            orderBy('created_at', 'desc'),
            limit(50)
        );

        const snapshot = await getDocs(q);
        const posts: Post[] = snapshot.docs.map(mapDocToPost);

        // Check likes
        if (user && posts.length > 0) {
            const postIds = posts.map(p => p.id);
            const likedPostIds = await getUserLikedPostIds(user.userId, postIds);
            posts.forEach(post => {
                post.isLiked = likedPostIds.has(post.id);
            });
        }

        return posts;
    } catch (err) {
        console.error("getUserPosts error:", err);
        return [];
    }
};

/**
 * Get posts liked by a user
 */
export const getLikedPosts = async (anonId: string): Promise<Post[]> => {
    try {
        // First find the user ID from anon ID
        const profilesRef = collection(db, COLLECTIONS.PROFILES);
        const profileQuery = query(profilesRef, where('anon_id', '==', anonId), limit(1));
        const profileSnap = await getDocs(profileQuery);

        if (profileSnap.empty) return [];

        const userId = profileSnap.docs[0].id;

        // Get interactions of type 'like' for this user
        const interactionsRef = collection(db, COLLECTIONS.INTERACTIONS);
        const likesQuery = query(
            interactionsRef,
            where('user_id', '==', userId),
            where('type', '==', 'like'),
            where('post_id', '!=', null),
            orderBy('post_id'), // Required for != filter
            orderBy('created_at', 'desc'),
            limit(50)
        );

        const likesSnap = await getDocs(likesQuery);
        const postIds = likesSnap.docs.map(doc => doc.data().post_id).filter(Boolean);

        if (postIds.length === 0) return [];

        // Fetch the actual posts
        const posts: Post[] = [];
        for (const postId of postIds) {
            const post = await getPostById(postId);
            if (post) {
                post.isLiked = true;
                posts.push(post);
            }
        }

        return posts;
    } catch (err) {
        console.error("getLikedPosts error:", err);
        return [];
    }
};

// ============================================================================
// POSTS - WRITE OPERATIONS
// ============================================================================

/**
 * Create a new post
 */
export const createPost = async (newPostData: { text: string; images?: string[]; tags: PostTag[] }): Promise<Post | null> => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ createPost: User not authenticated');
            alert('You must be logged in to create a post');
            throw new Error('User not authenticated');
        }

        console.log('📝 Creating post:', { userId: user.userId, college: user.college, tags: newPostData.tags });

        const postData: any = {
            author_id: user.userId,
            author_anon_id: user.anonId,
            display_name: user.displayName,
            avatar_color: user.avatarColor,
            avatar_url: user.avatarUrl || null,
            text: newPostData.text,
            tags: newPostData.tags || [],
            department: user.department || 'Other',
            college: user.college || 'Unknown',
            likes_count: 0,
            comments_count: 0,
            created_at: serverTimestamp(),
        };

        // Add images if provided
        if (newPostData.images && newPostData.images.length > 0) {
            postData.images = newPostData.images;
            postData.image_url = newPostData.images[0];
        }

        console.log('📤 Inserting post...');

        const postsRef = collection(db, COLLECTIONS.POSTS);
        const docRef = await addDoc(postsRef, postData);

        console.log('✅ Post created with ID:', docRef.id);

        // Return the created post
        const createdPost: Post = {
            id: docRef.id,
            authorAnonId: user.anonId,
            displayName: user.displayName,
            authorAvatarColor: user.avatarColor,
            authorAvatarUrl: user.avatarUrl,
            text: newPostData.text,
            imageUrl: newPostData.images?.[0],
            images: newPostData.images || [],
            department: user.department,
            college: user.college,
            tags: newPostData.tags,
            likesCount: 0,
            commentsCount: 0,
            createdAt: new Date(),
            trendingScore: 0,
            isLiked: false,
        };

        return createdPost;
    } catch (err: any) {
        console.error('❌ createPost error:', err);
        alert(`Failed to create post: ${err.message}`);
        return null;
    }
};

/**
 * Update a post's text
 */
export const updatePost = async (postId: string, text: string): Promise<boolean> => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ updatePost: No user authenticated');
            alert('You must be logged in to edit posts');
            return false;
        }

        // Verify ownership first
        const postRef = doc(db, COLLECTIONS.POSTS, postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
            alert('Post not found');
            return false;
        }

        if (postSnap.data().author_id !== user.userId) {
            alert('You can only edit your own posts');
            return false;
        }

        await updateDoc(postRef, {
            text: text,
            is_edited: true,
            updated_at: serverTimestamp(),
        });

        console.log('✅ Post updated successfully');
        return true;
    } catch (err: any) {
        console.error('❌ updatePost error:', err);
        alert(`Failed to update post: ${err.message}`);
        return false;
    }
};

/**
 * Delete a post
 */
export const deletePost = async (postId: string): Promise<boolean> => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ deletePost: No user authenticated');
            alert('You must be logged in to delete posts');
            return false;
        }

        // Verify ownership
        const postRef = doc(db, COLLECTIONS.POSTS, postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
            console.warn('Post not found');
            return true; // Already deleted
        }

        if (postSnap.data().author_id !== user.userId) {
            alert('You can only delete your own posts');
            return false;
        }

        // Delete related data in batch
        const batch = writeBatch(db);

        // Delete the post
        batch.delete(postRef);

        // Delete related comments
        const commentsRef = collection(db, COLLECTIONS.COMMENTS);
        const commentsQuery = query(commentsRef, where('post_id', '==', postId));
        const commentsSnap = await getDocs(commentsQuery);
        commentsSnap.docs.forEach(doc => batch.delete(doc.ref));

        // Delete related interactions
        const interactionsRef = collection(db, COLLECTIONS.INTERACTIONS);
        const interactionsQuery = query(interactionsRef, where('post_id', '==', postId));
        const interactionsSnap = await getDocs(interactionsQuery);
        interactionsSnap.docs.forEach(doc => batch.delete(doc.ref));

        // Delete related reports
        const reportsRef = collection(db, COLLECTIONS.REPORTS);
        const reportsQuery = query(reportsRef, where('post_id', '==', postId));
        const reportsSnap = await getDocs(reportsQuery);
        reportsSnap.docs.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        console.log('✅ Post and related data deleted');
        return true;
    } catch (err: any) {
        console.error('❌ deletePost error:', err);
        alert(`Failed to delete post: ${err.message}`);
        return false;
    }
};

// ============================================================================
// INTERACTIONS (LIKES)
// ============================================================================

/**
 * Get post IDs that a user has liked
 */
async function getUserLikedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
    try {
        if (!userId || postIds.length === 0) return new Set();

        const likedIds = new Set<string>();

        // Query interactions in batches (Firestore 'in' query limit is 30)
        const batchSize = 30;
        for (let i = 0; i < postIds.length; i += batchSize) {
            const batch = postIds.slice(i, i + batchSize);

            const interactionsRef = collection(db, COLLECTIONS.INTERACTIONS);
            const q = query(
                interactionsRef,
                where('user_id', '==', userId),
                where('type', '==', 'like'),
                where('post_id', 'in', batch)
            );

            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const postId = doc.data().post_id;
                if (postId) likedIds.add(postId);
            });
        }

        return likedIds;
    } catch (err) {
        console.error('getUserLikedPostIds error:', err);
        return new Set();
    }
}

/**
 * Toggle like on a post
 */
export const toggleLike = async (postId: string): Promise<number> => {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('❌ toggleLike: No user found');
            throw new Error('User not authenticated');
        }

        console.log(`🔄 toggleLike for post ${postId} by user ${user.userId}`);

        // Check for existing like
        const interactionsRef = collection(db, COLLECTIONS.INTERACTIONS);
        const existingQuery = query(
            interactionsRef,
            where('user_id', '==', user.userId),
            where('post_id', '==', postId),
            where('type', '==', 'like')
        );

        const existingSnap = await getDocs(existingQuery);
        const postRef = doc(db, COLLECTIONS.POSTS, postId);

        let newCount = 0;

        if (!existingSnap.empty) {
            // UNLIKE - Remove interaction
            console.log('👎 Removing like...');

            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) throw new Error('Post not found');

                const currentCount = postDoc.data().likes_count || 0;
                newCount = Math.max(0, currentCount - 1);

                // Delete the interaction
                transaction.delete(existingSnap.docs[0].ref);

                // Decrement count
                transaction.update(postRef, { likes_count: newCount });
            });

            console.log(`✅ Unlike successful. New count: ${newCount}`);
        } else {
            // LIKE - Add interaction
            console.log('👍 Adding like...');

            await runTransaction(db, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) throw new Error('Post not found');

                const currentCount = postDoc.data().likes_count || 0;
                newCount = currentCount + 1;

                // Add the interaction
                const newInteractionRef = doc(collection(db, COLLECTIONS.INTERACTIONS));
                transaction.set(newInteractionRef, {
                    user_id: user.userId,
                    post_id: postId,
                    type: 'like',
                    created_at: serverTimestamp(),
                });

                // Increment count
                transaction.update(postRef, { likes_count: newCount });
            });

            console.log(`✅ Like successful. New count: ${newCount}`);

            // Trigger notification (fire and forget)
            fetch('/api/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'like',
                    actorUserId: user.userId,
                    postId: postId
                })
            }).catch(e => console.error('Push trigger failed', e));
        }

        return newCount;
    } catch (err) {
        console.error('❌ toggleLike error:', err);
        throw err;
    }
};

// ============================================================================
// COMMENTS
// ============================================================================

/**
 * Get comments for a post
 */
export const getComments = async (postId: string): Promise<Comment[]> => {
    try {
        const user = await getCurrentUser();
        const commentsRef = collection(db, COLLECTIONS.COMMENTS);

        const q = query(
            commentsRef,
            where('post_id', '==', postId),
            orderBy('created_at', 'asc')
        );

        const snapshot = await getDocs(q);
        const comments = snapshot.docs.map(mapDocToComment);

        // Check if user has liked any comments
        if (user && comments.length > 0) {
            const commentIds = comments.map(c => c.id);
            const likedCommentIds = await getUserLikedCommentIds(user.userId, commentIds);
            comments.forEach(comment => {
                comment.isLiked = likedCommentIds.has(comment.id);
            });
        }

        return comments;
    } catch (err) {
        console.error('getComments error:', err);
        return [];
    }
};

/**
 * Add a comment to a post
 */
export const addComment = async (postId: string, text: string, parentId?: string): Promise<Comment> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const commentData: any = {
        post_id: postId,
        author_id: user.userId,
        author_anon_id: user.anonId,
        display_name: user.displayName,
        avatar_color: user.avatarColor,
        avatar_url: user.avatarUrl || null,
        text: text,
        likes_count: 0,
        created_at: serverTimestamp(),
    };

    if (parentId) {
        commentData.parent_id = parentId;
    }

    const commentsRef = collection(db, COLLECTIONS.COMMENTS);
    const docRef = await addDoc(commentsRef, commentData);

    // Increment comment count on post
    const postRef = doc(db, COLLECTIONS.POSTS, postId);
    await updateDoc(postRef, {
        comments_count: increment(1)
    });

    // Trigger notification
    fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 'comment',
            actorUserId: user.userId,
            postId: postId,
            data: { text: text }
        })
    }).catch(e => console.error('Push trigger failed', e));

    // Return the created comment
    return {
        id: docRef.id,
        postId: postId,
        parentId: parentId || null,
        authorAnonId: user.anonId,
        displayName: user.displayName,
        authorAvatarColor: user.avatarColor,
        authorAvatarUrl: user.avatarUrl,
        text: text,
        likesCount: 0,
        isLiked: false,
        createdAt: new Date(),
    };
};

/**
 * Get comment IDs that a user has liked
 */
async function getUserLikedCommentIds(userId: string, commentIds: string[]): Promise<Set<string>> {
    try {
        if (!userId || commentIds.length === 0) return new Set();

        const likedIds = new Set<string>();

        const batchSize = 30;
        for (let i = 0; i < commentIds.length; i += batchSize) {
            const batch = commentIds.slice(i, i + batchSize);

            const interactionsRef = collection(db, COLLECTIONS.INTERACTIONS);
            const q = query(
                interactionsRef,
                where('user_id', '==', userId),
                where('type', '==', 'like'),
                where('comment_id', 'in', batch)
            );

            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const commentId = doc.data().comment_id;
                if (commentId) likedIds.add(commentId);
            });
        }

        return likedIds;
    } catch (err) {
        console.error('getUserLikedCommentIds error:', err);
        return new Set();
    }
}

/**
 * Toggle like on a comment
 */
export const toggleCommentLike = async (commentId: string): Promise<number | undefined> => {
    try {
        const user = await getCurrentUser();
        if (!user) return undefined;

        const interactionsRef = collection(db, COLLECTIONS.INTERACTIONS);
        const existingQuery = query(
            interactionsRef,
            where('user_id', '==', user.userId),
            where('comment_id', '==', commentId),
            where('type', '==', 'like')
        );

        const existingSnap = await getDocs(existingQuery);
        const commentRef = doc(db, COLLECTIONS.COMMENTS, commentId);

        if (!existingSnap.empty) {
            // Unlike
            await deleteDoc(existingSnap.docs[0].ref);
            await updateDoc(commentRef, { likes_count: increment(-1) });
        } else {
            // Like
            await addDoc(interactionsRef, {
                user_id: user.userId,
                comment_id: commentId,
                type: 'like',
                created_at: serverTimestamp(),
            });
            await updateDoc(commentRef, { likes_count: increment(1) });
        }

        // Get new count
        const updatedComment = await getDoc(commentRef);
        return updatedComment.exists() ? updatedComment.data().likes_count : 0;
    } catch (err) {
        console.error('toggleCommentLike error:', err);
        return undefined;
    }
};

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Submit a report for a post
 */
export const submitReport = async (postId: string, reason: string): Promise<boolean | 'DELETED'> => {
    try {
        const user = await getCurrentUser();
        if (!user) return false;

        // Check if user already reported this post
        const reportsRef = collection(db, COLLECTIONS.REPORTS);
        const existingQuery = query(
            reportsRef,
            where('post_id', '==', postId),
            where('reporter_id', '==', user.userId)
        );
        const existingSnap = await getDocs(existingQuery);

        if (!existingSnap.empty) {
            console.log('User already reported this post');
            return true;
        }

        // Add the report
        await addDoc(reportsRef, {
            post_id: postId,
            reporter_id: user.userId,
            reason: reason,
            created_at: serverTimestamp(),
        });

        // Check if post should be auto-deleted (10+ reports)
        const allReportsQuery = query(reportsRef, where('post_id', '==', postId));
        const allReportsSnap = await getDocs(allReportsQuery);

        if (allReportsSnap.size >= 10) {
            console.log('🚨 Post exceeded report threshold, deleting...');
            const success = await deletePost(postId);
            if (success) return 'DELETED';
        }

        return true;
    } catch (err) {
        console.error('submitReport error:', err);
        return false;
    }
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new posts in a college (realtime feed updates)
 */
export const subscribeToNewPosts = (
    college: string,
    callback: (post: Post) => void
): (() => void) => {
    const postsRef = collection(db, COLLECTIONS.POSTS);
    const q = query(
        postsRef,
        where('college', '==', college),
        orderBy('created_at', 'desc'),
        limit(1)
    );

    return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                const post = mapDocToPost(change.doc);
                callback(post);
            }
        });
    }, (error) => {
        console.error('subscribeToNewPosts error:', error);
    });
};

/**
 * Subscribe to post updates (likes, comments count changes)
 */
export const subscribeToPostUpdates = (
    postId: string,
    callback: (likes: number, comments: number) => void
): (() => void) => {
    const postRef = doc(db, COLLECTIONS.POSTS, postId);

    return onSnapshot(postRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            callback(data.likes_count || 0, data.comments_count || 0);
        }
    }, (error) => {
        console.error('subscribeToPostUpdates error:', error);
    });
};

// ============================================================================
// PROFILES
// ============================================================================

/**
 * Get existing colleges for autocomplete
 */
export const getExistingColleges = async (): Promise<string[]> => {
    try {
        const profilesRef = collection(db, COLLECTIONS.PROFILES);
        const snapshot = await getDocs(profilesRef);

        const colleges = new Set<string>();
        snapshot.docs.forEach(doc => {
            const college = doc.data().college;
            if (college && college.trim()) {
                colleges.add(college.trim());
            }
        });

        return Array.from(colleges);
    } catch (err) {
        console.error('getExistingColleges error:', err);
        return [];
    }
};

// ============================================================================
// EXPORT COMPATIBILITY LAYER (for gradual migration)
// ============================================================================

// Re-export for backward compatibility
export { mapDocToPost as mapDbPostToPost };
