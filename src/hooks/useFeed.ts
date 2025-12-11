import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Post } from '../../types';
import { mapDbPostToPost } from '../../services/api';

const PAGE_SIZE = 10;
const CACHE_KEY = 'genfess_feed_cache_v1';

export const useFeed = (userCollege: string | undefined, userId: string | undefined) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    // Cache initialization
    useEffect(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Rehydrate dates
                    const hydrated = parsed.map((p: any) => ({
                        ...p,
                        createdAt: new Date(p.createdAt)
                    }));
                    setPosts(hydrated);
                    setLoading(false);
                }
            } catch (e) {
                console.error('Cache parse error', e);
            }
        }
    }, [userCollege]); // Reset cache if college changes? Logic usually stable for single user

    const fetchPosts = useCallback(async (pageNum: number, isRefresh = false) => {
        if (!userCollege) return;

        try {
            const { data, error } = await supabase.rpc('get_posts_paginated', {
                p_college: userCollege,
                p_limit: PAGE_SIZE,
                p_offset: pageNum * PAGE_SIZE,
                p_user_id: userId || null
            });

            if (error) throw error;

            const mappedPosts = (data || []).map((p: any) => ({
                ...mapDbPostToPost(p),
                isLiked: p.is_liked // RPC returns snake_case
            }));

            setPosts(prev => {
                const newPosts = isRefresh ? mappedPosts : [...prev, ...mappedPosts];
                // Remove duplicates based on ID
                const uniquePosts = Array.from(new Map(newPosts.map((p: Post) => [p.id, p])).values());

                // Update Cache if page 0
                if (pageNum === 0) {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(uniquePosts.slice(0, PAGE_SIZE)));
                }

                return uniquePosts;
            });

            setHasMore(data.length === PAGE_SIZE);
            if (isRefresh) setPage(0);
        } catch (error) {
            console.error('Feed fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userCollege, userId]);

    // Initial Load
    useEffect(() => {
        if (userCollege) {
            fetchPosts(0, true);
        }
    }, [userCollege, userId, fetchPosts]);

    // Load More
    const loadMore = useCallback(() => {
        if (!hasMore || loading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(nextPage);
    }, [hasMore, loading, page, fetchPosts]);

    // Refresh
    const refresh = useCallback(() => {
        setRefreshing(true);
        fetchPosts(0, true);
    }, [fetchPosts]);

    // Realtime: Lightweight Notifications
    useEffect(() => {
        if (!userCollege) return;

        const channel = supabase
            .channel('feed_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'feed_events'
                },
                async (payload) => {
                    const { post_id } = payload.new;
                    // Fetch the single new post securely via RPC
                    const { data, error } = await supabase.rpc('get_post_by_id', {
                        p_id: post_id,
                        p_user_id: userId || null
                    });

                    if (!error && data && data.length > 0) {
                        const newPost = {
                            ...mapDbPostToPost(data[0]),
                            isLiked: data[0].is_liked
                        };

                        // Only add if belongs to user's college (RPC doesn't filter by college for ID fetch, need check)
                        // Actually get_post_by_id returns college.
                        if (newPost.college === userCollege) {
                            setPosts(prev => {
                                // Check duplicate
                                if (prev.find(p => p.id === newPost.id)) return prev;
                                return [newPost, ...prev];
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userCollege, userId]);

    return { posts, setPosts, loading, hasMore, loadMore, refresh, refreshing };
};

