import React, { useState } from 'react';
import { Post, User } from '../types';
import { HeartIcon, ChatBubbleOvalLeftIcon, ShareIcon, ThreeDotsIcon, PhotoIcon } from './Icons';
import LazyImage from './LazyImage';
import * as api from '../services/api';

interface PostCardProps {
    post: Post;
    index: number;
    currentUser: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onImageClick: (images: string[], index: number) => void;
}

const PostCard: React.FC<PostCardProps> = ({
    post,
    index,
    currentUser,
    onCommentClick,
    onOptionsClick,
    onImageClick
}) => {
    const [isLiked, setIsLiked] = useState(post.isLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [isLikeAnimating, setIsLikeAnimating] = useState(false);

    // Initial state sync
    React.useEffect(() => {
        setIsLiked(post.isLiked);
        setLikesCount(post.likesCount);
    }, [post.isLiked, post.likesCount]);

    const handleLike = async () => {
        if (!currentUser) return;

        const newIsLiked = !isLiked;
        const newLikesCount = isLiked ? likesCount - 1 : likesCount + 1;

        // Optimistic update
        setIsLiked(newIsLiked);
        setLikesCount(newLikesCount);
        setIsLikeAnimating(true);
        setTimeout(() => setIsLikeAnimating(false), 300);

        try {
            await api.toggleLike(post.id, newIsLiked);
        } catch (error) {
            // Revert
            setIsLiked(!newIsLiked);
            setLikesCount(isLiked ? likesCount : likesCount);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Genfess',
                    text: post.text,
                    url: `${window.location.origin}/?post=${post.id}`
                });
            } catch (err) {
                console.error('Share failed', err);
            }
        } else {
            navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`);
            // Could show toast here if passed via props, but simple alert for now
        }
    };

    const timeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const hasImages = post.images && post.images.length > 0;

    return (
        <div className="w-full bg-surface dark:bg-dark-surface border-b border-border-color dark:border-dark-border-color py-4 animate-fade-in-up">
            {/* Header */}
            <div className="px-4 flex justify-between items-start mb-3">
                <div className="flex gap-3 items-center">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                        style={{ backgroundColor: post.authorAvatarColor || '#8b5cf6' }}
                    >
                        {post.authorAvatarUrl ? (
                            <img src={post.authorAvatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            (post.displayName || 'A').charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-primary-text dark:text-dark-primary-text text-sm">
                            {post.displayName}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-secondary-text dark:text-dark-secondary-text">
                            {post.department && <span>{post.department}</span>}
                            {post.department && <span>•</span>}
                            <span>{timeAgo(post.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => onOptionsClick(post)} className="text-secondary-text dark:text-dark-secondary-text p-1 hover:text-primary-text dark:hover:text-dark-primary-text transition-colors">
                    <ThreeDotsIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="px-4 mb-3">
                <p className="text-primary-text dark:text-dark-primary-text text-[15px] leading-relaxed whitespace-pre-wrap font-body">
                    {post.text}
                </p>
            </div>

            {/* Images */}
            {hasImages && (
                <div className="mb-3 overflow-hidden">
                    <div
                        className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 cursor-pointer"
                        onClick={() => onImageClick(post.images || [], 0)}
                    >
                        <LazyImage
                            src={post.images![0]}
                            alt="Post content"
                            className="w-full h-full object-cover"
                        />
                        {post.images!.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm">
                                <PhotoIcon className="w-3 h-3" />
                                <span>1/{post.images!.length}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="px-4 flex items-center justify-between mt-2">
                <div className="flex items-center gap-6">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-2 transition-colors active:scale-90 ${isLiked ? 'text-accent-pink' : 'text-primary-text dark:text-dark-primary-text'}`}
                    >
                        <div className={`${isLikeAnimating ? 'animate-bounce-custom' : ''}`}>
                            <HeartIcon className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                        </div>
                        <span className="text-sm font-medium">{likesCount}</span>
                    </button>

                    <button
                        onClick={() => onCommentClick(post)}
                        className="flex items-center gap-2 text-primary-text dark:text-dark-primary-text transition-all hover:opacity-70 active:scale-95"
                    >
                        <ChatBubbleOvalLeftIcon className="w-6 h-6" />
                        <span className="text-sm font-medium">{post.commentsCount}</span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-primary-text dark:text-dark-primary-text transition-all hover:opacity-70 active:scale-95"
                    >
                        <ShareIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostCard;
