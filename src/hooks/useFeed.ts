/**
 * ============================================================================
 * USE FEED HOOK - Firebase Firestore Implementation
 * ============================================================================
 * 
 * Custom hook for fetching and managing the post feed
 * Uses Firestore for data and real-time updates
 * 
 * Features:
 * - Paginated feed loading
 * - Local caching for instant initial render
 * - Real-time updates for new posts
 * - Pull-to-refresh support
 * - Optimistic UI updates
 * - Poll vote tracking
 * 
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    getDocs,
    onSnapshot,
    QueryDocumentSnapshot,
    DocumentData
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Post } from '../../types';
import { mapDocToPost } from '../../services/firestoreService';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PAGE_SIZE = 15;
const CACHE_KEY = 'genfess_feed_cache_v3';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get liked post IDs for current user
 */
async function getUserLikedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
    if (!userId || postIds.length === 0) return new Set();

    try {
        const likedIds = new Set<string>();
        const batchSize = 30;

        for (let i = 0; i < postIds.length; i += batchSize) {
            const batch = postIds.slice(i, i + batchSize);
            const interactionsRef = collection(db, 'interactions');
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
 * Get user's poll votes for multiple posts
 */
async function getUserPollVotes(userId: string, postIds: string[]): Promise<Map<string, string>> {
    if (!userId || postIds.length === 0) return new Map();

    try {
        const votesMap = new Map<string, string>();
        const batchSize = 30;

        for (let i = 0; i < postIds.length; i += batchSize) {
            const batch = postIds.slice(i, i + batchSize);
            const interactionsRef = collection(db, 'interactions');
            const q = query(
                interactionsRef,
                where('user_id', '==', userId),
                where('type', '==', 'vote'),
                where('post_id', 'in', batch)
            );

            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.post_id && data.option_id) {
                    votesMap.set(data.post_id, data.option_id);
                }
            });
        }

        return votesMap;
    } catch (err) {
        console.error('getUserPollVotes error:', err);
        return new Map();
    }
}

// ============================================================================
// USE FEED HOOK
// ============================================================================

export const useFeed = (userCollege: string | undefined, userId: string | undefined) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const isLoadingMore = useRef(false);

    // ========================================================================
    // CACHE MANAGEMENT
    // ========================================================================

    // Load cached posts on initial mount
    useEffect(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const hydrated = parsed.map((p: any) => ({
                        ...p,
                        createdAt: new Date(p.createdAt)
                    }));
                    setPosts(hydrated);
                    setLoading(false);
                    console.log(`📦 Loaded ${hydrated.length} posts from cache`);
                }
            } catch (e) {
                console.error('Cache parse error:', e);
                localStorage.removeItem(CACHE_KEY);
            }
        }
    }, []);

    // ========================================================================
    // FETCH POSTS
    // ========================================================================

    const fetchPosts = useCallback(async (isRefresh = false) => {
        if (!userCollege) {
            setLoading(false);
            return;
        }

        try {
            const postsRef = collection(db, 'posts');
            let q;

            if (isRefresh || !lastDocRef.current) {
                // Initial load or refresh
                q = query(
                    postsRef,
                    where('college', '==', userCollege),
                    orderBy('created_at', 'desc'),
                    limit(PAGE_SIZE)
                );
            } else {
                // Load more (pagination)
                q = query(
                    postsRef,
                    where('college', '==', userCollege),
                    orderBy('created_at', 'desc'),
                    startAfter(lastDocRef.current),
                    limit(PAGE_SIZE)
                );
            }

            const snapshot = await getDocs(q);
            const newPosts: Post[] = snapshot.docs.map(doc => mapDocToPost(doc as any));

            // Update last doc for pagination
            if (snapshot.docs.length > 0) {
                lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            }

            // Check likes and poll votes for posts
            if (userId && newPosts.length > 0) {
                const postIds = newPosts.map(p => p.id);

                // Fetch likes and votes in parallel
                const [likedPostIds, pollVotes] = await Promise.all([
                    getUserLikedPostIds(userId, postIds),
                    getUserPollVotes(userId, postIds)
                ]);

                newPosts.forEach(post => {
                    post.isLiked = likedPostIds.has(post.id);

                    // Set user's poll vote if they voted on this poll
                    if (post.poll && pollVotes.has(post.id)) {
                        post.poll.userVotedOptionId = pollVotes.get(post.id);
                    }
                });
            }

            setPosts(prev => {
                let updatedPosts: Post[];

                if (isRefresh) {
                    updatedPosts = newPosts;
                    lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
                } else {
                    // Append and dedupe
                    const combined = [...prev, ...newPosts];
                    updatedPosts = Array.from(
                        new Map(combined.map(p => [p.id, p])).values()
                    );
                }

                // Cache first page
                if (isRefresh && updatedPosts.length > 0) {
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedPosts.slice(0, PAGE_SIZE)));
                    } catch (e) {
                        console.warn('Cache save failed:', e);
                    }
                }

                return updatedPosts;
            });

            setHasMore(snapshot.docs.length === PAGE_SIZE);
            console.log(`📨 Fetched ${newPosts.length} posts for ${userCollege}`);
        } catch (error) {
            console.error('Feed fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            isLoadingMore.current = false;
        }
    }, [userCollege, userId]);

    // ========================================================================
    // INITIAL LOAD
    // ========================================================================

    useEffect(() => {
        if (userCollege) {
            fetchPosts(true);
        }
    }, [userCollege, userId, fetchPosts]);

    // ========================================================================
    // REALTIME SUBSCRIPTION (New Posts)
    // ========================================================================

    useEffect(() => {
        if (!userCollege) return;

        const postsRef = collection(db, 'posts');
        const q = query(
            postsRef,
            where('college', '==', userCollege),
            orderBy('created_at', 'desc'),
            limit(1)
        );

        // Track the first snapshot to ignore initial data
        let isFirstSnapshot = true;

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            // Skip the first snapshot (it's the initial data)
            if (isFirstSnapshot) {
                isFirstSnapshot = false;
                return;
            }

            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    const newPost = mapDocToPost(change.doc as any);

                    // Check if post is already in the list
                    setPosts(prev => {
                        if (prev.find(p => p.id === newPost.id)) {
                            return prev;
                        }

                        // Check if user liked or voted on this post
                        if (userId) {
                            Promise.all([
                                getUserLikedPostIds(userId, [newPost.id]),
                                getUserPollVotes(userId, [newPost.id])
                            ]).then(([likedIds, pollVotes]) => {
                                setPosts(current =>
                                    current.map(p => {
                                        if (p.id === newPost.id) {
                                            const updatedPost = { ...p, isLiked: likedIds.has(newPost.id) };
                                            if (updatedPost.poll && pollVotes.has(newPost.id)) {
                                                updatedPost.poll.userVotedOptionId = pollVotes.get(newPost.id);
                                            }
                                            return updatedPost;
                                        }
                                        return p;
                                    })
                                );
                            });
                        }

                        console.log('🆕 New post received via realtime:', newPost.id);
                        return [newPost, ...prev];
                    });
                }
            });
        }, (error) => {
            console.error('Feed realtime subscription error:', error);
        });

        console.log(`📡 Subscribed to realtime feed for ${userCollege}`);

        return () => {
            unsubscribe();
            console.log(`📡 Unsubscribed from realtime feed`);
        };
    }, [userCollege, userId]);

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    const loadMore = useCallback(() => {
        if (!hasMore || loading || isLoadingMore.current) return;

        isLoadingMore.current = true;
        fetchPosts(false);
    }, [hasMore, loading, fetchPosts]);

    const refresh = useCallback(() => {
        setRefreshing(true);
        lastDocRef.current = null; // Reset pagination
        fetchPosts(true);
    }, [fetchPosts]);

    // ========================================================================
    // RETURN VALUE
    // ========================================================================

    return {
        posts,
        setPosts,
        loading,
        hasMore,
        loadMore,
        refresh,
        refreshing
    };
};

export default useFeed;
