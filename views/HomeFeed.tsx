
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
    onShareSuccess?: (message: string) => void;
}

const FeedSkeleton = () => (
    <div className="w-full bg-dark-surface border-b border-white/5 p-4 md:rounded-2xl md:mb-5 md:border">
        <div className="flex items-center mb-4">
            <div className="w-11 h-11 rounded-full bg-white/5 mr-3 animate-pulse"></div>
            <div className="space-y-2">
                <div className="h-3 bg-white/5 rounded w-24 animate-pulse"></div>
                <div className="h-2 bg-white/5 rounded w-32 animate-pulse"></div>
            </div>
        </div>
        <div className="space-y-3 mb-4">
            <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
            <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse"></div>
        </div>
        <div className="w-full aspect-square bg-white/5 rounded-xl animate-pulse"></div>
    </div>
);

const HomeFeed: React.FC<HomeFeedProps> = ({ user, onCommentClick, onOptionsClick, onViewImages, newPost, deletedPostId, updatedPost, onNotificationClick, onShareSuccess }) => {
    const { posts, setPosts, loading, hasMore, loadMore, refresh, refreshing } = useFeed(user?.college, user?.userId);

    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);
    const feedContainerRef = useRef<HTMLDivElement>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [pullDelta, setPullDelta] = useState(0);
    const [isReadyToRefresh, setIsReadyToRefresh] = useState(false);

    useEffect(() => {
        if (user && 'Notification' in window && Notification.permission === 'granted') {
            registerPushSubscription().catch(() => { });
        }
    }, [user]);

    useEffect(() => {
        if (newPost) {
            setPosts(prev => {
                const uniquePosts = prev.filter(p => p.id !== newPost.id);
                if (!newPost.id.startsWith('temp_')) {
                    const tempFiltered = uniquePosts.filter(p => !(p.id.startsWith('temp_') && p.text === newPost.text));
                    return [newPost, ...tempFiltered];
                }
                return [newPost, ...uniquePosts];
            });
            feedContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [newPost, setPosts]);

    useEffect(() => {
        if (deletedPostId) {
            setPosts(prev => prev.filter(p => p.id !== deletedPostId));
        }
    }, [deletedPostId, setPosts]);

    useEffect(() => {
        if (updatedPost) {
            setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
        }
    }, [updatedPost, setPosts]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const currentScrollY = e.currentTarget.scrollTop;

        requestAnimationFrame(() => {
            if (currentScrollY > 10 && currentScrollY > lastScrollY.current) {
                setShowHeader(false); // Hide on scroll down
            } else if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
                setShowHeader(true); // Show on scroll up
            }
            lastScrollY.current = currentScrollY;

            if (!loading && hasMore && (currentScrollY + e.currentTarget.clientHeight) >= e.currentTarget.scrollHeight * 0.85) {
                loadMore();
            }
        });
    }, [loading, hasMore, loadMore]);

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
    const rotation = refreshing ? 0 : pullDelta * 2;

    return (
        <div className="h-full flex flex-col bg-dark-background overflow-hidden relative">
            <Header isVisible={showHeader} user={user} onNotificationClick={onNotificationClick} />

            <div
                ref={feedContainerRef}
                className="flex-grow overflow-y-auto relative no-scrollbar will-change-transform pt-20"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)' }}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Pull to Refresh Spinner */}
                <div
                    className="absolute left-0 right-0 flex justify-center z-20 pointer-events-none transition-all duration-300"
                    style={{
                        top: refreshing ? '80px' : (pullDelta > 0 ? `${Math.min(pullDelta * 0.4, 80)}px` : '10px'),
                        opacity: showPill ? 1 : 0,
                    }}
                >
                    <div className="bg-dark-surface rounded-full p-2.5 shadow-xl border border-white/10">
                        <ArrowPathIcon
                            className={`w-5 h-5 text-accent-cyan ${refreshing ? 'animate-spin' : ''}`}
                            style={{ transform: `rotate(${rotation}deg)` }}
                        />
                    </div>
                </div>

                <div
                    className="max-w-xl mx-auto w-full transition-transform duration-300 ease-out"
                    style={{
                        transform: `translateY(${refreshing ? 20 : (pullDelta > 0 ? pullDelta * 0.15 : 0)}px)`,
                    }}
                >
                    {posts.length > 0 ? (
                        <>
                            <div className="md:pt-4">
                                {posts.map((post, index) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        index={index}
                                        currentUser={user}
                                        onCommentClick={onCommentClick}
                                        onOptionsClick={onOptionsClick}
                                        onImageClick={onViewImages}
                                        onShareSuccess={onShareSuccess}
                                    />
                                ))}
                            </div>

                            {loading && (
                                <div className="space-y-5 mt-4">
                                    <FeedSkeleton />
                                    <FeedSkeleton />
                                </div>
                            )}

                            {!hasMore && !loading && posts.length > 5 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-14 h-14 rounded-full gradient-premium-soft flex items-center justify-center mb-3 text-2xl">
                                        🎉
                                    </div>
                                    <p className="text-sm font-medium text-dark-secondary-text">
                                        You've reached the end
                                    </p>
                                    <p className="text-xs text-dark-secondary-text/60 mt-1">
                                        Pull down to refresh
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        loading ? (
                            <div className="space-y-5 pt-4">
                                <FeedSkeleton />
                                <FeedSkeleton />
                                <FeedSkeleton />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[60vh] px-8 text-center animate-fade-in">
                                <div className="w-20 h-20 gradient-premium-soft rounded-full flex items-center justify-center mb-6">
                                    <span className="text-4xl">📝</span>
                                </div>
                                <h3 className="text-xl font-bold text-dark-primary-text mb-2">No posts yet</h3>
                                <p className="text-dark-secondary-text max-w-xs">
                                    {user?.college
                                        ? `Be the first to create a post for ${user.college}!`
                                        : "Join a college to verify your account and see posts."}
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
