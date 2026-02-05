
import React, { useState, useRef, useEffect, memo } from 'react';
import { Post, User } from '../types/index';
import { HeartIcon, ChatBubbleOvalLeftIcon, ThreeDotsIcon, ShareIcon, BookmarkIcon } from './Icons';
import * as api from '../services/api';

import { linkifyText } from '../utils/textUtils';
import LazyImage from './LazyImage';

interface PostCardProps {
    post: Post;
    currentUser?: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onImageClick: (images: string[], index: number) => void;
    onShareSuccess?: (message: string) => void;
    index?: number;
}

const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m`;
    return "now";
};

const PostCard: React.FC<PostCardProps> = memo(({ post, currentUser, onCommentClick, onOptionsClick, onImageClick, onShareSuccess, index = 0 }) => {
    // Derived state for consistency (show updated profile immediately for own posts)
    const isOwner = currentUser?.anonId === post.authorAnonId;
    const displayName = isOwner ? currentUser.displayName : post.displayName;
    const avatarUrl = isOwner ? currentUser.avatarUrl : post.authorAvatarUrl;
    const avatarColor = isOwner ? currentUser.avatarColor : post.authorAvatarColor;
    const college = isOwner ? currentUser.college : post.college;
    const department = isOwner ? currentUser.department : post.department;

    const [isLiked, setIsLiked] = useState(post.isLiked || false);
    const [likesCount, setLikesCount] = useState(post.likesCount);

    // ... rest of state ...
    const [commentsCount, setCommentsCount] = useState(post.commentsCount);
    const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
    const [showHeart, setShowHeart] = useState(false);
    const [showBookmarkAnimation, setShowBookmarkAnimation] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isVisible, setIsVisible] = useState(index < 3);
    const [isSharing, setIsSharing] = useState(false);

    const heartTimeoutRef = useRef<number | null>(null);
    const bookmarkTimeoutRef = useRef<number | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible || index < 3) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );

        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [index, isVisible]);

    useEffect(() => {
        const unsubscribe = api.subscribeToCommentCount(post.id, setCommentsCount);
        return () => unsubscribe();
    }, [post.id]);

    const postImages = (post.images && post.images.length > 0)
        ? post.images
        : (post.imageUrl ? [post.imageUrl] : []);

    const handleLikeToggle = () => {
        if (navigator.vibrate) navigator.vibrate(10);

        const newLikedState = !isLiked;
        const previousLikeState = isLiked;
        const previousCount = likesCount;

        setIsLiked(newLikedState);
        setLikesCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

        if (newLikedState) {
            if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
            setShowHeart(true);
            heartTimeoutRef.current = window.setTimeout(() => setShowHeart(false), 1200);
        }

        api.toggleLike(post.id).then((response) => {
            if (response != null && response >= 0) {
                setLikesCount(response);
            }
        }).catch((error) => {
            console.error('Like toggle failed:', error);
            setIsLiked(previousLikeState);
            setLikesCount(previousCount);
        });
    };

    const handleBookmarkToggle = async () => {
        if (navigator.vibrate) navigator.vibrate(10);

        const newBookmarkState = !isBookmarked;
        const previousState = isBookmarked;

        setIsBookmarked(newBookmarkState);

        if (newBookmarkState) {
            if (bookmarkTimeoutRef.current) clearTimeout(bookmarkTimeoutRef.current);
            setShowBookmarkAnimation(true);
            bookmarkTimeoutRef.current = window.setTimeout(() => setShowBookmarkAnimation(false), 600);
        }

        try {
            await api.toggleBookmark(post.id);
        } catch (error) {
            console.error('Bookmark failed:', error);
            setIsBookmarked(previousState);
        }
    };

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        if (navigator.vibrate) navigator.vibrate(10);

        try {
            const result = await api.sharePost(post);
            if (result === 'shared') onShareSuccess?.('Shared successfully!');
            else if (result === 'copied') onShareSuccess?.('Link copied to clipboard!');
        } catch (error) {
            console.error('Share failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const index = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
        if (index !== currentSlide) setCurrentSlide(index);
    };

    const animationDelay = index < 10 ? `${index * 0.05}s` : '0s';

    return (
        <div
            ref={cardRef}
            className="w-full bg-dark-surface flex flex-col mb-3 md:mb-5 rounded-none md:rounded-2xl border-b md:border border-white/5 overflow-hidden animate-slide-up-fade opacity-0 fill-mode-forwards"
            style={index < 8 ? { animationDelay } : { opacity: 1, animation: 'none' }}
        >
            {/* Header */}
            <div className="flex items-center p-3.5">
                {/* Avatar with gradient ring on hover */}
                <div className="relative group">
                    <div
                        className="relative w-11 h-11 rounded-full flex items-center justify-center overflow-hidden bg-dark-border"
                        style={{ backgroundColor: (avatarUrl && !avatarError) ? undefined : avatarColor }}
                    >
                        {avatarUrl && !avatarError ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={() => setAvatarError(true)}
                                loading="lazy"
                            />
                        ) : (
                            <span className="text-white font-bold text-lg">
                                {(displayName || 'A').charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    {/* Gradient ring effect */}
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-pink opacity-0 group-hover:opacity-50 transition-opacity -z-10 blur-sm" />
                </div>

                <div className="flex-1 min-w-0 ml-3">
                    {/* Username Badge - Visible everywhere */}
                    <div className="flex items-center gap-2">
                        <span className="username-badge">
                            {displayName}
                        </span>
                        {timeAgo(post.createdAt) === 'now' && (
                            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse shadow-glow-cyan" title="Just posted" />
                        )}
                    </div>
                    {college && (
                        <p className="text-xs font-medium text-dark-secondary-text truncate mt-0.5">
                            {college} {department ? `• ${department}` : ''}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => onOptionsClick(post)}
                    className="p-2 -mr-2 text-dark-secondary-text hover:text-dark-primary-text transition-colors rounded-full hover:bg-white/5"
                >
                    <ThreeDotsIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Post Content (Text) */}
            <div
                className={`px-4 pb-3 ${postImages.length === 0 ? 'pt-1' : ''}`}
                onDoubleClick={postImages.length === 0 ? handleLikeToggle : undefined}
            >
                <div className="relative">
                    <p className="text-[17px] leading-relaxed text-dark-primary-text whitespace-pre-wrap break-words font-normal">
                        {linkifyText(post.text)}
                    </p>
                    {/* Heart Animation for text posts */}
                    {showHeart && postImages.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="relative">
                                <HeartIcon className="w-24 h-24 text-accent-pink fill-accent-pink drop-shadow-2xl" style={{ animation: 'heartBurst 0.8s ease-out forwards' }} />
                                {/* Particle effects */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute w-2 h-2 rounded-full bg-accent-pink"
                                            style={{
                                                animation: `particle 0.6s ease-out forwards`,
                                                animationDelay: `${i * 0.05}s`,
                                                transform: `rotate(${i * 60}deg) translateY(-40px)`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Images */}
            {postImages.length > 0 && (
                <div className="relative w-full aspect-square bg-dark-background overflow-hidden">
                    <div
                        className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
                        onScroll={handleScroll}
                    >
                        {postImages.map((imgUrl, idx) => (
                            <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                                <LazyImage
                                    src={imgUrl}
                                    lowResSrc={idx === 0 ? post.thumbPath : undefined}
                                    alt={`Post ${idx + 1}`}
                                    className="w-full h-full object-cover"
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

                    {/* Pagination Dots */}
                    {postImages.length > 1 && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
                            {postImages.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx
                                        ? 'w-4 bg-accent-cyan shadow-glow-cyan'
                                        : 'w-1.5 bg-white/30'
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Heart Overlay */}
                    {showHeart && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="relative">
                                <HeartIcon className="w-28 h-28 text-white fill-white" style={{ animation: 'heartBurst 0.8s ease-out forwards', filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))' }} />
                                {/* Particle effects */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {[...Array(8)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute w-3 h-3 rounded-full bg-white"
                                            style={{
                                                animation: `particle 0.7s ease-out forwards`,
                                                animationDelay: `${i * 0.04}s`,
                                                transform: `rotate(${i * 45}deg) translateY(-50px)`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Image Counter Badge */}
                    {postImages.length > 1 && (
                        <div className="absolute top-3 right-3 bg-dark-background/70 backdrop-blur-md text-white/90 text-[10px] font-bold px-2 py-1 rounded-full border border-white/10">
                            {currentSlide + 1}/{postImages.length}
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-5">
                    <ActionButton
                        icon={HeartIcon}
                        activeIcon={<HeartIcon className="w-7 h-7 text-accent-pink fill-accent-pink animate-like-pop" />}
                        onClick={handleLikeToggle}
                        active={isLiked}
                    />
                    <ActionButton
                        icon={ChatBubbleOvalLeftIcon}
                        onClick={() => onCommentClick(post)}
                    />
                    <ActionButton
                        icon={ShareIcon}
                        onClick={handleShare}
                        disabled={isSharing}
                        className={isSharing ? 'opacity-50' : ''}
                    />
                </div>
                <div>
                    <ActionButton
                        icon={BookmarkIcon}
                        activeIcon={<BookmarkIcon className="w-7 h-7 text-accent-cyan fill-accent-cyan" />}
                        onClick={handleBookmarkToggle}
                        active={isBookmarked}
                        className={showBookmarkAnimation ? 'animate-bounce-small' : ''}
                    />
                </div>
            </div>

            {/* Footer Stats */}
            <div className="px-4 pb-4">
                <p className="text-sm font-semibold text-dark-primary-text">
                    {(likesCount || 0).toLocaleString()} {(likesCount || 0) === 1 ? 'like' : 'likes'}
                </p>

                {commentsCount > 0 && (
                    <button
                        onClick={() => onCommentClick(post)}
                        className="mt-1 text-dark-secondary-text text-sm hover:text-dark-primary-text transition-colors"
                    >
                        View all {commentsCount} comments
                    </button>
                )}

                <p className="text-[10px] text-dark-secondary-text uppercase tracking-wider mt-1.5 font-medium">
                    {timeAgo(post.createdAt)}
                </p>
            </div>
        </div>
    );
});

interface ActionButtonProps {
    icon: React.ElementType;
    activeIcon?: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    disabled?: boolean;
    className?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, activeIcon, onClick, active, disabled, className = '' }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`group active:scale-90 transition-all duration-200 focus:outline-none ${className}`}
        >
            {active && activeIcon ? (
                activeIcon
            ) : (
                <Icon className="w-7 h-7 text-dark-secondary-text group-hover:text-dark-primary-text transition-colors" />
            )}
        </button>
    );
};

export default PostCard;
