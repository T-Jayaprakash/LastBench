/**
 * ReelsView - Instagram-style vertical scrolling reels
 * Each post takes full screen and snaps one at a time
 * Advertisement banners appear every 6-8 reels
 */

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useFeed } from '../src/hooks/useFeed';
import PostCard from '../components/PostCard';
import LazyImage from '../components/LazyImage';
import { User, Post } from '../types';
import * as api from '../services/api';

interface ReelsViewProps {
    user: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onViewImages: (images: string[], index: number) => void;
}

// Default GenFess advertisement banners (permanent - never expire)
const DEFAULT_AD_BANNERS = [
    {
        id: 'genfess-reel-ad-1',
        imageUrl: '/banners/banner_1.png',
        title: 'Share Your Stories Anonymously',
        subtitle: 'Your voice matters. Express yourself freely.',
        ctaText: 'Start Confessing'
    },
    {
        id: 'genfess-reel-ad-2',
        imageUrl: '/banners/banner_2.png',
        title: 'Your Campus, Your Voice',
        subtitle: 'Connect with your college community.',
        ctaText: 'Join Now'
    },
    {
        id: 'genfess-reel-ad-3',
        imageUrl: '/banners/banner_3.png',
        title: 'Create Polls. Get Answers.',
        subtitle: 'Know what your peers think.',
        ctaText: 'Create Poll'
    },
    {
        id: 'genfess-reel-ad-4',
        imageUrl: '/banners/banner_4.png',
        title: 'Connect. Confess. Celebrate.',
        subtitle: 'Join the GenFess community today.',
        ctaText: 'Get Started'
    }
];

type ReelItem =
    | { type: 'post'; data: Post }
    | { type: 'ad'; data: typeof DEFAULT_AD_BANNERS[0] }
    | { type: 'banner'; data: Post };

const ReelsView: React.FC<ReelsViewProps> = ({
    user,
    onCommentClick,
    onOptionsClick,
    onViewImages,
}) => {
    const { posts, setPosts, loading, hasMore, loadMore, refresh } = useFeed(user?.college, user?.userId);
    const [bannerPosts, setBannerPosts] = useState<Post[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    // Fetch user-posted banners
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const banners = await api.getBannerPosts();
                setBannerPosts(banners);
            } catch (error) {
                console.error('Failed to fetch banners:', error);
            }
        };
        fetchBanners();
    }, []);

    // Infinite Scroll Observer
    const lastItemRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, loadMore]);

    // Vote Handler
    const handleVote = async (postId: string, optionId: string) => {
        setPosts(prev => prev.map(post => {
            if (post.id === postId && post.poll) {
                if (post.poll.userVotedOptionId) return post;

                const newOptions = post.poll.options.map(opt => {
                    if (opt.id === optionId) {
                        return { ...opt, voteCount: opt.voteCount + 1 };
                    }
                    return opt;
                });

                return {
                    ...post,
                    poll: {
                        ...post.poll,
                        options: newOptions,
                        totalVotes: post.poll.totalVotes + 1,
                        userVotedOptionId: optionId
                    }
                };
            }
            return post;
        }));

        try {
            await import('../services/api').then(api => api.voteOnPoll(postId, optionId));
        } catch (error) {
            console.error('Vote failed', error);
            refresh();
        }
    };

    // Create reels feed with ads inserted every 6-8 posts
    const reelItems: ReelItem[] = useMemo(() => {
        const items: ReelItem[] = [];
        let adIndex = 0;
        let nextAdPosition = Math.floor(Math.random() * 3) + 6; // First ad between 6-8

        // Combine default ads and user banners for rotation
        const allAds = [
            ...DEFAULT_AD_BANNERS.map(ad => ({ type: 'ad' as const, data: ad })),
            ...bannerPosts.map(banner => ({ type: 'banner' as const, data: banner }))
        ];

        posts.forEach((post, index) => {
            items.push({ type: 'post', data: post });

            // Insert ad after every 6-8 posts
            if ((index + 1) === nextAdPosition && allAds.length > 0) {
                const ad = allAds[adIndex % allAds.length];
                items.push(ad);
                adIndex++;
                nextAdPosition += Math.floor(Math.random() * 3) + 6; // Next ad 6-8 posts later
            }
        });

        return items;
    }, [posts, bannerPosts]);

    return (
        <div className="fixed inset-0 bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-40 pt-4 px-4 bg-gradient-to-b from-black/60 to-transparent h-16 pointer-events-none">
                <h1 className="text-white font-bold text-xl drop-shadow-lg">Reels</h1>
            </div>

            {/* Reels Container - Vertical Snap Scroll */}
            <div
                ref={containerRef}
                className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
                style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
            >
                {reelItems.map((item, index) => (
                    <div
                        key={item.type === 'post' ? item.data.id : item.type === 'ad' ? item.data.id : `banner-${item.data.id}`}
                        ref={index === reelItems.length - 1 ? lastItemRef : null}
                        className="w-full h-screen snap-start snap-always flex-shrink-0"
                        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                    >
                        {item.type === 'post' ? (
                            <PostCard
                                post={item.data}
                                index={index}
                                currentUser={user}
                                onCommentClick={onCommentClick}
                                onOptionsClick={onOptionsClick}
                                onImageClick={onViewImages}
                                onVote={handleVote}
                                variant="fullscreen"
                            />
                        ) : item.type === 'ad' ? (
                            // GenFess Default Ad Banner (Full Screen Reel Style)
                            <div className="relative w-full h-full bg-black">
                                {/* Background Image */}
                                <LazyImage
                                    src={item.data.imageUrl}
                                    alt={item.data.title}
                                    className="w-full h-full object-cover"
                                />

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

                                {/* Sponsored Label */}
                                <div className="absolute top-20 left-4 right-4">
                                    <span className="text-xs text-white/70 font-medium px-2 py-1 bg-white/10 rounded-full backdrop-blur-sm">
                                        ✨ GenFess
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="absolute bottom-24 left-4 right-16 space-y-3">
                                    <h2 className="text-white text-2xl font-bold drop-shadow-lg leading-tight">
                                        {item.data.title}
                                    </h2>
                                    <p className="text-white/80 text-base drop-shadow-md">
                                        {item.data.subtitle}
                                    </p>

                                    {/* CTA Button */}
                                    <button className="mt-4 px-6 py-2.5 bg-white text-black font-bold text-sm rounded-full active:scale-95 transition-transform shadow-lg">
                                        {item.data.ctaText}
                                    </button>
                                </div>

                                {/* Side Icons (for visual consistency) */}
                                <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="text-white text-xs mt-1">Ad</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // User-Posted Banner (Full Screen Reel Style)
                            <div className="relative w-full h-full bg-black">
                                {/* Background Image */}
                                {(item.data.imageUrl || (item.data.images && item.data.images[0])) && (
                                    <LazyImage
                                        src={item.data.imageUrl || item.data.images![0]}
                                        alt="Banner"
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

                                {/* Sponsored Label */}
                                <div className="absolute top-20 left-4 right-4 flex items-center gap-2">
                                    <span className="text-xs text-yellow-400 font-medium px-2 py-1 bg-yellow-500/10 rounded-full backdrop-blur-sm">
                                        📢 Sponsored
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="absolute bottom-24 left-4 right-16 space-y-2">
                                    {/* Author */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
                                            style={{ backgroundColor: item.data.authorAvatarColor || '#333' }}
                                        >
                                            {item.data.authorAvatarUrl ? (
                                                <img src={item.data.authorAvatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                item.data.displayName?.charAt(0).toUpperCase() || 'A'
                                            )}
                                        </div>
                                        <span className="text-white font-semibold text-sm">{item.data.displayName}</span>
                                    </div>

                                    <p className="text-white text-lg font-medium drop-shadow-lg leading-snug line-clamp-3">
                                        {item.data.text}
                                    </p>
                                </div>

                                {/* Interaction Icons */}
                                <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span className="text-white text-xs mt-1">{item.data.likesCount}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <span className="text-white text-xs mt-1">{item.data.commentsCount}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading Indicator */}
                {loading && (
                    <div className="w-full h-screen snap-start flex items-center justify-center bg-black">
                        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                )}

                {/* End Message */}
                {!hasMore && posts.length > 0 && (
                    <div className="w-full h-screen snap-start flex items-center justify-center bg-black">
                        <div className="text-center">
                            <p className="text-white/60 text-lg">You're all caught up! 🎉</p>
                            <button
                                onClick={refresh}
                                className="mt-4 px-6 py-2 bg-white/10 text-white rounded-full text-sm font-medium active:scale-95 transition-transform"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && posts.length === 0 && (
                    <div className="w-full h-screen snap-start flex items-center justify-center bg-black">
                        <div className="text-center px-8">
                            <p className="text-white text-xl font-medium mb-2">No reels yet</p>
                            <p className="text-white/50">Be the first to share something!</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom safe area spacer for navigation */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </div>
    );
};

export default ReelsView;
