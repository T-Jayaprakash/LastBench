
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post, User } from '../types/index';
import * as api from '../services/api';
import Header from '../components/Header';
import PostCard from '../components/PostCard';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ArrowPathIcon, ArrowUpIcon } from '../components/Icons';
import { registerPushSubscription } from '../services/userService';
import { useSupabaseRealtime } from '../src/hooks/useSupabaseRealtime';
import { mergeRealtimeEvent } from '../src/utils/realtimeUtils';

const PULL_THRESHOLD = 120; // Increased threshold for better feel
const AUTO_REFRESH_INTERVAL = 15000; // 15 seconds
const INITIAL_LOAD_COUNT = 15; // Reduced for faster initial load (TTI)
const PAGINATION_SIZE = 15; // Load 15 more posts when scrolling
const SCROLL_DEBOUNCE = 100; // Debounce scroll events for performance

interface HomeFeedProps {
    user: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onViewImages: (images: string[], index: number) => void;
    newPost: Post | null;
    deletedPostId: string | null;
    updatedPost?: Post | null;
    onNotificationClick: () => void;
}

const FeedSkeleton = () => (
    <div className="w-full bg-card-bg dark:bg-dark-card-bg border-b border-border-color dark:border-dark-border-color p-4 animate-pulse">
        <div className="flex items-center mb-4">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 mr-3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
        </div>
        <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
        </div>
        <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded mb-3"></div>
    </div>
);

const HomeFeed: React.FC<HomeFeedProps> = ({ user, onCommentClick, onOptionsClick, onViewImages, newPost, deletedPostId, updatedPost, onNotificationClick }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    // Removed newPostsAvailable state as requested

    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);
    const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastPostIdRef = useRef<string | null>(null);

    const feedContainerRef = useRef<HTMLDivElement>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [pullDelta, setPullDelta] = useState(0);
    const [isReadyToRefresh, setIsReadyToRefresh] = useState(false);

    // Instagram-like Initial Load: Load latest posts FAST
    useEffect(() => {
        const loadFeed = async () => {
            // 1. Show cached posts immediately (no delay)
            const cachedPosts = api.getCachedPosts();
            if (cachedPosts.length > 0) {
                setPosts(cachedPosts.slice(0, INITIAL_LOAD_COUNT));
                setLoading(false); // Stop loading immediately with cached data
                lastPostIdRef.current = cachedPosts[0]?.id || null;
            }

            // 2. Register push notifications in background (non-blocking)
            if ('Notification' in window && Notification.permission === 'granted') {
                registerPushSubscription().catch(() => { });
            }

            // 3. Fetch ONLY latest posts first (Instagram strategy)
            try {
                const latestPosts = await api.getPosts(0, INITIAL_LOAD_COUNT);
                if (latestPosts.length > 0) {
                    setPosts(latestPosts);
                    lastPostIdRef.current = latestPosts[0]?.id || null;
                    setHasMore(latestPosts.length === INITIAL_LOAD_COUNT);
                    setLoading(false);

                    // 4. Load remaining posts in background (non-blocking)
                    loadRemainingPostsInBackground();
                } else if (cachedPosts.length === 0) {
                    setPosts([]);
                    setHasMore(false);
                }
            } catch (error) {
                console.error("Failed to fetch posts:", error);
                if (cachedPosts.length === 0) {
                    setPosts([]);
                }
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadFeed();
        }

        // Cleanup on unmount
        return () => {
            if (autoRefreshTimerRef.current) {
                clearInterval(autoRefreshTimerRef.current);
            }
        };
    }, []);

    // Realtime subscription for posts (feature-flagged)
    // @ts-ignore - Vite env var
    const useRealtimeEnabled = import.meta.env?.VITE_USE_SUPABASE_REALTIME === 'true';

    useSupabaseRealtime(
        'posts',
        async (payload) => {
            console.log('📡 Realtime post event:', payload.eventType, payload);

            if (payload.eventType === 'INSERT' && payload.new) {
                // Fetch full post details including profile to prevent crashes/missing data
                const fullPost = await api.getPostById(payload.new.id);

                if (fullPost) {
                    setPosts(currentPosts => {
                        // Check for duplicates
                        if (currentPosts.some(p => p.id === fullPost.id)) return currentPosts;

                        // Update lastPostIdRef
                        lastPostIdRef.current = fullPost.id;

                        // Vibrate
                        if (!document.hidden && 'vibrate' in navigator) {
                            navigator.vibrate(10);
                        }

                        return [fullPost, ...currentPosts];
                    });
                }
            } else {
                setPosts(currentPosts => {
                    // For UPDATE events, we need to merge carefully to preserve profile data
                    if (payload.eventType === 'UPDATE' && payload.new) {
                        const updatedDbPost = payload.new;
                        return currentPosts.map(post => {
                            if (post.id === updatedDbPost.id) {
                                // Merge the update while preserving existing profile data
                                return {
                                    ...post,
                                    text: updatedDbPost.text || post.text,
                                    likesCount: updatedDbPost.likes_count ?? post.likesCount,
                                    commentsCount: updatedDbPost.comments_count ?? post.commentsCount,
                                    trendingScore: (updatedDbPost.likes_count || 0) + ((updatedDbPost.comments_count || 0) * 2),
                                };
                            }
                            return post;
                        });
                    }

                    // For DELETE, use the standard merge
                    if (payload.eventType === 'DELETE') {
                        return mergeRealtimeEvent(currentPosts, payload);
                    }

                    return currentPosts;
                });
            }
        },
        {
            events: ['INSERT', 'UPDATE', 'DELETE'],
            debounceMilliseconds: 150,
            enabled: useRealtimeEnabled && !!user
        }
    );


    // Load remaining posts in background after initial load
    const loadRemainingPostsInBackground = async () => {
        try {
            // Wait a bit to let UI settle
            await new Promise(resolve => setTimeout(resolve, 500));

            const olderPosts = await api.getPosts(1, PAGINATION_SIZE);
            if (olderPosts.length > 0) {
                setPosts(prev => {
                    // Merge without duplicates
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPosts = olderPosts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPosts];
                });
                setHasMore(olderPosts.length === PAGINATION_SIZE);
                setCurrentPage(1);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to load remaining posts:", error);
        }
    };

    // Auto-refresh: Check for new posts every 5 seconds (Instagram-like real-time feed)
    useEffect(() => {
        // Register for push notifications on mount
        if ('Notification' in window && Notification.permission === 'granted') {
            registerPushSubscription().catch(() => { });
        }

        const checkForNewPosts = async () => {
            try {
                const latestPosts = await api.getPosts(0, 5);
                if (latestPosts.length > 0) {
                    const newestPostId = latestPosts[0].id;

                    // Only update if we have new posts
                    if (lastPostIdRef.current && newestPostId !== lastPostIdRef.current) {
                        setPosts(prev => {
                            const existingIds = new Set(prev.map(p => p.id));
                            const newUniquePosts = latestPosts.filter(p => !existingIds.has(p.id));

                            if (newUniquePosts.length > 0) {
                                lastPostIdRef.current = newestPostId;

                                // Trigger local notification if app is in background
                                if (document.hidden) {
                                    LocalNotifications.schedule({
                                        notifications: [{
                                            title: "New Gossip!",
                                            body: `${newUniquePosts[0].displayName} posted something new!`,
                                            id: Date.now(),
                                            schedule: { at: new Date(Date.now() + 100) },
                                        }]
                                    }).catch(e => console.error("Local notification failed", e));
                                }

                                // Prepend new posts regardless of scroll position (Instagram behavior)
                                return [...newUniquePosts, ...prev];
                            }
                            return prev;
                        });
                    } else if (!lastPostIdRef.current) {
                        // Initialize the ref on first run
                        lastPostIdRef.current = newestPostId;
                    }
                }
            } catch (error) {
                console.error("Auto-refresh failed:", error);
            }
        };

        // Run immediately on mount
        checkForNewPosts();

        // Start auto-refresh timer (5 seconds for real-time feel)
        autoRefreshTimerRef.current = setInterval(checkForNewPosts, 5000);

        return () => {
            if (autoRefreshTimerRef.current) {
                clearInterval(autoRefreshTimerRef.current);
            }
        };
    }, []);

    // Load new posts when banner is clicked
    // Removed loadNewPosts as it is now automatic

    // Listen for new posts from create view (handles both optimistic and real posts)
    useEffect(() => {
        if (newPost) {
            setPosts(prev => {
                // Check if this is a replacement for an optimistic post
                if (!newPost.id.startsWith('temp_')) {
                    // Real post - remove any temp posts with same text and prepend real one
                    const filtered = prev.filter(p =>
                        !(p.id.startsWith('temp_') && p.text === newPost.text)
                    );
                    lastPostIdRef.current = newPost.id;
                    return [newPost, ...filtered];
                } else {
                    // Optimistic post - just add it
                    return [newPost, ...prev];
                }
            });

            if (feedContainerRef.current) {
                feedContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [newPost]);

    // Listen for deleted posts (Global broadcast)
    useEffect(() => {
        if (deletedPostId) {
            setPosts(prev => prev.filter(p => p.id !== deletedPostId));
        }
    }, [deletedPostId]);

    useEffect(() => {
        if (updatedPost) {
            setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
        }
    }, [updatedPost]);

    // Infinite scroll: Load more posts when reaching bottom (Optimized with RAF)
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const currentScrollY = e.currentTarget.scrollTop;
        const scrollHeight = e.currentTarget.scrollHeight;
        const clientHeight = e.currentTarget.clientHeight;

        // Use requestAnimationFrame for smooth 60fps scrolling
        requestAnimationFrame(() => {
            // Header show/hide logic (debounced)
            if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
                if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                    setShowHeader(false);
                } else {
                    setShowHeader(true);
                }
                lastScrollY.current = currentScrollY;
            }

            // Infinite scroll: Load more when 80% scrolled (optimized trigger)
            if (!loadingMore && hasMore && (currentScrollY + clientHeight) >= scrollHeight * 0.8) {
                loadMorePosts();
            }
        });
    }, [loadingMore, hasMore]);

    const loadMorePosts = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);

        try {
            const nextPage = currentPage + 1;
            const morePosts = await api.getPosts(nextPage * PAGINATION_SIZE, PAGINATION_SIZE);

            if (morePosts.length > 0) {
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPosts = morePosts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPosts];
                });
                setCurrentPage(nextPage);
                setHasMore(morePosts.length === PAGINATION_SIZE);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to load more posts:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        if (navigator.vibrate) navigator.vibrate(50);

        try {
            const freshPosts = await api.getPosts(0, INITIAL_LOAD_COUNT);
            if (freshPosts.length > 0) {
                setPosts(freshPosts);
                lastPostIdRef.current = freshPosts[0]?.id || null;
                setCurrentPage(0);
                setHasMore(freshPosts.length === INITIAL_LOAD_COUNT);

                // Load more in background
                loadRemainingPostsInBackground();
            }
        } catch (error) {
            console.error("Refresh failed:", error);
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
                setPullDelta(0);
                setIsReadyToRefresh(false);
            }, 600);
        }
    }, [isRefreshing]);

    // Pull-to-refresh disabled as requested ("remove the refresh option")
    // Pull-to-refresh implementation (Instagram style)
    const handleTouchStart = (e: React.TouchEvent) => {
        if (feedContainerRef.current?.scrollTop === 0) {
            setTouchStartY(e.touches[0].clientY);
            setIsReadyToRefresh(true);
        } else {
            setIsReadyToRefresh(false);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isReadyToRefresh || touchStartY === null) return;

        const currentY = e.touches[0].clientY;
        const delta = currentY - touchStartY;

        if (delta > 0) {
            // Resistance effect
            e.preventDefault(); // Prevent standard scroll while pulling
            setPullDelta(delta);
        }
    };

    const handleTouchEnd = () => {
        if (!isReadyToRefresh) return;

        if (pullDelta > PULL_THRESHOLD) {
            handleRefresh();
        } else {
            // Snap back
            setPullDelta(0);
        }
        setTouchStartY(null);
        setIsReadyToRefresh(false);
    };

    const showPill = pullDelta > 10 || isRefreshing;
    const pillTranslateY = isRefreshing ? 20 : Math.min(pullDelta * 0.4, 60);
    const rotation = isRefreshing ? 0 : pullDelta * 2;

    return (
        <div className="h-full flex flex-col bg-background dark:bg-dark-background overflow-hidden relative">
            <Header isVisible={showHeader} user={user} onNotificationClick={onNotificationClick} />

            {/* New Posts Available Banner (Instagram-like) */}
            {/* Banner removed as requested */}

            <div
                ref={feedContainerRef}
                className="flex-grow overflow-y-auto relative pt-[85px] no-scrollbar will-change-transform"
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Pull to Refresh Spinner (Instagram Style) */}
                <div
                    className="absolute left-0 right-0 flex justify-center z-10 pointers-events-none"
                    style={{
                        top: '10px',
                        transform: `translateY(${pillTranslateY}px) rotate(${rotation}deg)`,
                        opacity: showPill ? 1 : 0,
                        transition: isRefreshing ? 'top 0.3s ease' : 'none'
                    }}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg border border-gray-100 dark:border-gray-700">
                        <ArrowPathIcon className={`w-6 h-6 text-accent-primary ${isRefreshing ? 'animate-spin' : ''}`} />
                    </div>
                </div>

                <div
                    style={{
                        transform: `translateY(${isRefreshing ? 60 : (pullDelta > 0 ? pullDelta * 0.2 : 0)}px)`,
                        transition: isRefreshing ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.1s',
                    }}
                >
                    {loading && posts.length === 0 ? (
                        <div className="pb-20">
                            <FeedSkeleton />
                            <FeedSkeleton />
                            <FeedSkeleton />
                            <FeedSkeleton />
                            <FeedSkeleton />
                        </div>
                    ) : posts.length > 0 ? (
                        <>
                            <div className="space-y-2 pb-20">
                                {posts.map((post, index) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        index={index}
                                        currentUser={user}
                                        onCommentClick={onCommentClick}
                                        onOptionsClick={onOptionsClick}
                                        onImageClick={onViewImages}
                                    />
                                ))}
                            </div>

                            {/* Loading More Indicator - Instagram Style */}
                            {loadingMore && (
                                <div className="pb-20">
                                    <FeedSkeleton />
                                    <FeedSkeleton />
                                    <FeedSkeleton />
                                </div>
                            )}

                            {/* End of Feed Indicator */}
                            {!hasMore && !loadingMore && posts.length > 5 && (
                                <div className="flex justify-center py-8 pb-20">
                                    <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
                                        You're all caught up! 🎉
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[60vh] px-8 text-center animate-fade-in">
                            <p className="text-lg font-medium text-primary-text dark:text-dark-primary-text mb-2">No posts yet</p>
                            <p className="text-secondary-text dark:text-dark-secondary-text">
                                {user?.college
                                    ? `Be the first to post something for ${user.college}!`
                                    : "Complete your profile to see posts."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomeFeed;
