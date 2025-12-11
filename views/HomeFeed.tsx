import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Post, User } from '../types/index';
import Header from '../components/Header';
import PostCard from '../components/PostCard';
import { ArrowPathIcon } from '../components/Icons';
import { registerPushSubscription } from '../services/userService';
import { useFeed } from '../src/hooks/useFeed';

const PULL_THRESHOLD = 120;

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
    // Antigravity Hook: Handles Pagination, Caching, and Lightweight Realtime
    const { posts, setPosts, loading, hasMore, loadMore, refresh, refreshing } = useFeed(user?.college, user?.userId);

    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);
    const feedContainerRef = useRef<HTMLDivElement>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [pullDelta, setPullDelta] = useState(0);
    const [isReadyToRefresh, setIsReadyToRefresh] = useState(false);

    // Initial Push Registration
    useEffect(() => {
        if (user && 'Notification' in window && Notification.permission === 'granted') {
            registerPushSubscription().catch(() => { });
        }
    }, [user]);

    // Handle Optimistic New Post
    useEffect(() => {
        if (newPost) {
            setPosts(prev => {
                if (!newPost.id.startsWith('temp_')) {
                    // Replace temp post with real one
                    const filtered = prev.filter(p => !(p.id.startsWith('temp_') && p.text === newPost.text));
                    // Check duplicate real post
                    if (filtered.some(p => p.id === newPost.id)) return filtered;
                    return [newPost, ...filtered];
                } else {
                    // Add temp post
                    return [newPost, ...prev];
                }
            });
            feedContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [newPost, setPosts]);

    // Handle Deleted Post
    useEffect(() => {
        if (deletedPostId) {
            setPosts(prev => prev.filter(p => p.id !== deletedPostId));
        }
    }, [deletedPostId, setPosts]);

    // Handle Updated Post
    useEffect(() => {
        if (updatedPost) {
            setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
        }
    }, [updatedPost, setPosts]);

    // Infinite Scroll
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const currentScrollY = e.currentTarget.scrollTop;
        const scrollHeight = e.currentTarget.scrollHeight;
        const clientHeight = e.currentTarget.clientHeight;

        requestAnimationFrame(() => {
            // Header Hiding Logic
            if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
                if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                    setShowHeader(false);
                } else {
                    setShowHeader(true);
                }
                lastScrollY.current = currentScrollY;
            }

            // Load More Logic (85% threshold)
            if (!loading && hasMore && (currentScrollY + clientHeight) >= scrollHeight * 0.85) {
                loadMore();
            }
        });
    }, [loading, hasMore, loadMore]);

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
            e.preventDefault();
            setPullDelta(delta);
        }
    };

    const handleTouchEnd = () => {
        if (!isReadyToRefresh) return;
        if (pullDelta > PULL_THRESHOLD) {
            if (navigator.vibrate) navigator.vibrate(50);
            refresh();
        }
        setPullDelta(0);
        setTouchStartY(null);
        setIsReadyToRefresh(false);
    };

    const showPill = pullDelta > 10 || refreshing;
    const pillTranslateY = refreshing ? 20 : Math.min(pullDelta * 0.4, 60);
    const rotation = refreshing ? 0 : pullDelta * 2;

    return (
        <div className="h-full flex flex-col bg-background dark:bg-dark-background overflow-hidden relative">
            <Header isVisible={showHeader} user={user} onNotificationClick={onNotificationClick} />

            <div
                ref={feedContainerRef}
                className="flex-grow overflow-y-auto relative pt-[85px] no-scrollbar will-change-transform"
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Pull to Refresh Spinner */}
                <div
                    className="absolute left-0 right-0 flex justify-center z-10 pointer-events-none"
                    style={{
                        top: '10px',
                        transform: `translateY(${pillTranslateY}px) rotate(${rotation}deg)`,
                        opacity: showPill ? 1 : 0,
                        transition: refreshing ? 'top 0.3s ease' : 'none'
                    }}
                >
                    <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg border border-gray-100 dark:border-gray-700">
                        <ArrowPathIcon className={`w-6 h-6 text-accent-primary ${refreshing ? 'animate-spin' : ''}`} />
                    </div>
                </div>

                <div
                    style={{
                        transform: `translateY(${refreshing ? 60 : (pullDelta > 0 ? pullDelta * 0.2 : 0)}px)`,
                        transition: refreshing ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.1s',
                    }}
                >
                    {posts.length > 0 ? (
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

                            {loading && (
                                <div className="pb-20">
                                    <FeedSkeleton />
                                    <FeedSkeleton />
                                </div>
                            )}

                            {!hasMore && !loading && posts.length > 5 && (
                                <div className="flex justify-center py-8 pb-20">
                                    <p className="text-sm text-secondary-text dark:text-dark-secondary-text">
                                        You're all caught up! 🎉
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        loading ? (
                            <div className="pb-20">
                                <FeedSkeleton />
                                <FeedSkeleton />
                                <FeedSkeleton />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[60vh] px-8 text-center animate-fade-in">
                                <p className="text-lg font-medium text-primary-text dark:text-dark-primary-text mb-2">No posts yet</p>
                                <p className="text-secondary-text dark:text-dark-secondary-text">
                                    {user?.college
                                        ? `Be the first to post something for ${user.college}!`
                                        : "Complete your profile to see posts."}
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomeFeed;
