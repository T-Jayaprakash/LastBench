
import React, { useState, useRef, useEffect, memo } from 'react';
import { Post, User } from '../types/index';
import { HeartIcon, ChatBubbleOvalLeftIcon, ThreeDotsIcon } from './Icons';
import * as api from '../services/api';

interface PostCardProps {
    post: Post;
    currentUser?: User | null;
    // Changed signatures to accept post object, enabling stable references in parent
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onImageClick: (images: string[], index: number) => void;
    index?: number;
}

const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}Y`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}MO`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}D`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}H`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}M`;
    return "NOW";
};

// Use memo to prevent re-renders of list items when parent state changes (like header visibility)
const PostCard: React.FC<PostCardProps> = memo(({ post, currentUser, onCommentClick, onOptionsClick, onImageClick, index = 0 }) => {
    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [showHeart, setShowHeart] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isVisible, setIsVisible] = useState(index < 3); // First 3 posts visible immediately

    const heartTimeoutRef = useRef<number | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Intersection observer for lazy loading posts outside viewport
    useEffect(() => {
        if (isVisible || index < 3) return; // Skip if already visible or in first 3

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' } // Start loading 50px before entering viewport
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, [index, isVisible]);

    // Only sync isLiked on initial mount, not on every prop change
    // This prevents the state from resetting when posts are refreshed
    useEffect(() => {
        // Only update if the post ID changed (different post)
        const postId = post.id;
        return () => {
            // Cleanup if needed
        };
    }, [post.id]);


    const postImages = (post.images && post.images.length > 0)
        ? post.images
        : (post.imageUrl ? [post.imageUrl] : []);

    const handleLikeToggle = () => {
        if (navigator.vibrate) navigator.vibrate(10);

        const newLikedState = !isLiked;
        const previousLikeState = isLiked;
        const previousCount = likesCount;

        // Optimistic UI update (Instagram-style instant feedback)
        setIsLiked(newLikedState);
        setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

        // Show heart animation when liking
        if (newLikedState) {
            if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
            setShowHeart(true);
            heartTimeoutRef.current = window.setTimeout(() => setShowHeart(false), 1200);
        }

        // Make API call in background
        api.toggleLike(post.id).then((response) => {
            // Only update count if API returns a valid count
            if (response !== null && response !== undefined && response >= 0) {
                setLikesCount(response);
            }
            // If response is valid, keep the liked state as is
        }).catch((error) => {
            // On error, revert to previous state
            console.error('Like toggle failed:', error);
            setIsLiked(previousLikeState);
            setLikesCount(previousCount);
        });
    };

    useEffect(() => {
        return () => {
            if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
        };
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.offsetWidth;
        const index = Math.round(scrollLeft / width);
        // Only update state if index actually changed to reduce re-renders
        if (index !== currentSlide) {
            setCurrentSlide(index);
        }
    };

    // Stagger animation only for first few items
    const animationDelay = index < 10 ? `${index * 0.02}s` : '0s';
    const animationClass = index < 10 ? 'animate-slide-up-fade opacity-0 fill-mode-forwards' : '';

    return (
        <div
            ref={cardRef}
            className={`w-full bg-card-bg dark:bg-dark-card-bg flex flex-col border-b border-border-color dark:border-dark-border-color ${animationClass}`}
            style={index < 6 ? { animationDelay: animationDelay, animationFillMode: 'forwards' } : {}}
        >
            {/* Post Header */}
            <div className="flex items-center p-3">
                <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-lg mr-3 flex-shrink-0 text-white overflow-hidden bg-gray-300"
                    style={{ backgroundColor: (post.authorAvatarUrl && !avatarError) ? 'transparent' : post.authorAvatarColor }}
                >
                    {post.authorAvatarUrl && !avatarError ? (
                        <img
                            src={post.authorAvatarUrl}
                            alt={post.displayName}
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                            loading="lazy"
                        />
                    ) : (
                        (post.displayName || 'A').charAt(0).toUpperCase()
                    )}
                </div>
                <div>
                    <p className="font-bold text-sm text-primary-text dark:text-dark-primary-text">{post.displayName}</p>
                </div>
                <button
                    onClick={() => onOptionsClick(post)}
                    className="ml-auto opacity-60 hover:opacity-100 transition-opacity p-2 text-primary-text dark:text-dark-primary-text"
                    title="Options"
                >
                    <ThreeDotsIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Post Text */}
            <div
                className="px-4 pt-1 pb-3 relative"
                onDoubleClick={postImages.length === 0 ? handleLikeToggle : undefined}
            >
                <p className="text-xl font-medium leading-snug text-primary-text dark:text-dark-primary-text whitespace-pre-wrap break-words">
                    {post.text}
                </p>
            </div>

            {/* Image Carousel */}
            {postImages.length > 0 && (
                <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-900">
                    <div
                        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
                        onScroll={handleScroll}
                    >
                        {postImages.map((imgUrl, idx) => (
                            <div
                                key={idx}
                                className="w-full h-full flex-shrink-0 snap-center relative"
                            >
                                <img
                                    src={imgUrl}
                                    alt={`Post content ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    loading={index < 3 && idx === 0 ? "eager" : "lazy"}
                                    decoding="async"
                                    fetchPriority={index < 3 && idx === 0 ? "high" : "low"}
                                    onClick={() => onImageClick(postImages, idx)}
                                />
                                <div
                                    className="absolute inset-0"
                                    onDoubleClick={handleLikeToggle}
                                    onClick={() => onImageClick(postImages, idx)}
                                />
                            </div>
                        ))}
                    </div>

                    {postImages.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                            {postImages.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx
                                        ? 'bg-accent-primary scale-110'
                                        : 'bg-white/60'
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {showHeart && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <HeartIcon
                                fill="white"
                                className="w-24 h-24 text-white drop-shadow-lg animate-heart-pop"
                            />
                        </div>
                    )}

                    {postImages.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                            {currentSlide + 1}/{postImages.length}
                        </div>
                    )}
                </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center p-2 gap-1">
                <ActionButton icon={HeartIcon} onClick={handleLikeToggle} active={isLiked} activeColor="text-red-500 fill-red-500" />
                <ActionButton icon={ChatBubbleOvalLeftIcon} onClick={() => onCommentClick(post)} />
            </div>

            {/* Stats & Content */}
            <div className="px-3 pb-4">
                <div className="flex gap-3 text-sm font-bold mb-1 text-primary-text dark:text-dark-primary-text">
                    <p className="transition-all duration-300">{(likesCount || 0).toLocaleString()} {(likesCount || 0) === 1 ? 'like' : 'likes'}</p>
                </div>

                {post.commentsCount > 0 && (
                    <button onClick={() => onCommentClick(post)} className="cursor-pointer text-sm text-secondary-text dark:text-dark-secondary-text mt-1 active:opacity-60 transition-opacity">
                        View all {post.commentsCount} comments
                    </button>
                )}
                <p className="text-xs text-secondary-text dark:text-dark-secondary-text mt-1 uppercase">{timeAgo(post.createdAt)}</p>
            </div>
        </div>
    );
});

interface ActionButtonProps {
    icon: React.ElementType;
    onClick?: () => void;
    active?: boolean;
    activeColor?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, onClick, active, activeColor }) => {
    const activeClasses = active && activeColor ? activeColor : "text-primary-text dark:text-dark-primary-text";
    return (
        <button onClick={onClick} className="p-2 active:scale-90 transition-transform duration-200">
            <Icon className={`w-7 h-7 transition-colors duration-300 ${activeClasses}`} />
        </button>
    );
};

export default PostCard;
