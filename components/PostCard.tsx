import React, { useState } from 'react';
import { Post, User } from '../types';
import { HeartIcon, ChatBubbleOvalLeftIcon, ShareIcon, ThreeDotsIcon, PhotoIcon, BookmarkIcon } from './Icons';
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
    onImageClick,
    onVote
}) => {
    const [isLiked, setIsLiked] = useState(post.isLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showBigHeart, setShowBigHeart] = useState(false);

    const handleDoubleTap = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        handleLike();
        setShowBigHeart(true);
        setTimeout(() => setShowBigHeart(false), 1000);
    };

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

        try {
            await api.toggleLike(post.id);
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
            alert('Link copied to clipboard!');
        }
    };

    const handleVote = (optionId: string) => {
        if (onVote) {
            onVote(post.id, optionId);
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

    // Helper to detect links in text
    const renderTextWithLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const hasImages = post.images && post.images.length > 0;

    return (
        <div className="w-full bg-black border-b border-white/5 py-0 mb-0">
            {/* Header */}
            <div className="px-3 py-2 flex justify-between items-center">
                <div className="flex gap-2.5 items-center">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ring-1 ring-white/10 overflow-hidden"
                        style={{ backgroundColor: post.authorAvatarColor || '#262626' }}
                    >
                        {post.authorAvatarUrl ? (
                            <img src={post.authorAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            (post.displayName || 'A').charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                            <span className="font-semibold text-white text-[13px] leading-tight hover:opacity-80 transition-opacity cursor-pointer">
                                {post.displayName}
                            </span>
                            <span className="text-[11px] text-gray-500">•</span>
                            <span className="text-[11px] text-gray-500">{timeAgo(post.createdAt)}</span>
                        </div>
                        {/* Optional location/dept if needed, but keeping minimal for parity */}
                    </div>
                </div>
                <button onClick={() => onOptionsClick(post)} className="text-white p-1 hover:opacity-70 transition-opacity">
                    <ThreeDotsIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Content / Media Area */}

            <div
                className="w-full relative group"
                onDoubleClick={handleDoubleTap}
            >
                {/* Big Heart Animation Overlay */}
                <div
                    className={`absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${showBigHeart ? 'opacity-100' : 'opacity-0'}`}
                >
                    <HeartIcon
                        className={`w-24 h-24 text-white fill-white drop-shadow-lg transition-transform duration-300 ${showBigHeart ? 'scale-100' : 'scale-0'}`}
                    />
                </div>

                {hasImages ? (
                    // Image Carousel (Exact same as before)
                    <div className="relative">
                        <div
                            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full aspect-[4/5] bg-[#1a1a1a]"
                            onScroll={(e) => {
                                const scrollLeft = e.currentTarget.scrollLeft;
                                const width = e.currentTarget.offsetWidth;
                                const index = Math.round(scrollLeft / width);
                                setActiveImageIndex(index);
                            }}
                        >
                            {post.images!.map((img, i) => (
                                <div
                                    key={i}
                                    className="w-full min-w-full h-full snap-center flex items-center justify-center bg-black"
                                    onClick={() => onImageClick(post.images!, i)}
                                >
                                    <LazyImage
                                        src={img}
                                        alt={`Post image ${i + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Dots */}
                        {post.images!.length > 1 && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
                                {post.images!.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`rounded-full transition-all duration-300 ${i === activeImageIndex
                                            ? 'w-1.5 h-1.5 bg-white'
                                            : 'w-1.5 h-1.5 bg-white/40'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* 1/N Badge */}
                        {post.images!.length > 1 && (
                            <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md pointer-events-none z-10">
                                {activeImageIndex + 1}/{post.images!.length}
                            </div>
                        )}
                    </div>
                ) : post.text ? (
                    // TEXT AS MEDIA (Instagram Quote/Text style)
                    // Centered, nicely typeset text taking up visual space
                    <div className="w-full min-h-[300px] flex items-center justify-center px-6 py-10 bg-black border-y border-white/5">
                        <p className="text-white text-[17px] leading-relaxed whitespace-pre-wrap font-sans font-medium text-center">
                            {renderTextWithLinks(post.text)}
                        </p>
                    </div>
                ) : null}
            </div>

            {/* Polls (Below media, if any) */}
            {post.poll && (
                <div className="px-3 py-2 border-t border-white/5">
                    <div className="flex flex-col gap-2">
                        {post.poll.options.map((option) => {
                            const percentage = post.poll!.totalVotes > 0
                                ? Math.round((option.voteCount / post.poll!.totalVotes) * 100)
                                : 0;
                            const isVoted = post.poll!.userVotedOptionId === option.id;

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleVote(option.id)}
                                    disabled={!!post.poll!.userVotedOptionId}
                                    className="relative w-full h-10 rounded-lg overflow-hidden bg-[#1F2937] border border-gray-700 transition-all active:scale-[0.98]"
                                >
                                    <div
                                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${isVoted ? 'bg-green-900/50' : 'bg-gray-700/50'}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                                        <span className="text-sm font-medium text-white">{option.text}</span>
                                        <span className="text-xs text-gray-400 font-bold">{percentage}%</span>
                                    </div>
                                </button>
                            );
                        })}
                        <div className="text-[11px] text-gray-500 pl-1">
                            {post.poll.totalVotes} votes
                        </div>
                    </div>
                </div>
            )}


            {/* Actions Row */}
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                {/* Left Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleLike}
                        className="active:scale-95 transition-transform"
                    >
                        <HeartIcon
                            className={`w-[26px] h-[26px] stroke-[1.8px] ${isLiked ? 'fill-[#FF3040] text-[#FF3040]' : 'text-white fill-transparent'}`}
                        />
                    </button>
                    <button
                        onClick={() => onCommentClick(post)}
                        className="active:scale-95 transition-transform text-white hover:opacity-70"
                    >
                        <ChatBubbleOvalLeftIcon className="w-[26px] h-[26px] stroke-[1.8px] -rotate-90" style={{ transform: 'scaleX(-1)' }} />
                    </button>
                    <button
                        onClick={handleShare}
                        className="active:scale-95 transition-transform text-white hover:opacity-70"
                    >
                        <ShareIcon className="w-[24px] h-[24px] stroke-[1.8px]" />
                    </button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center">
                    <button className="active:scale-95 transition-transform text-white hover:opacity-70">
                        <BookmarkIcon className="w-[24px] h-[24px] stroke-[1.8px]" />
                    </button>
                </div>
            </div>

            {/* Footer Info */}
            <div className="px-3 pb-3 space-y-1">
                {/* Likes Count */}
                <div className="text-white font-semibold text-[13px]">
                    {likesCount === 0 ? 'Be the first to like this' : `${likesCount} like${likesCount !== 1 ? 's' : ''}`}
                </div>

                {/* Caption (Only if has images, otherwise text is already shown as media) */}
                {hasImages && post.text && (
                    <div className="text-[13px] text-white leading-tight">
                        <span className="font-semibold mr-1">{post.displayName}</span>
                        <span className="font-normal">{renderTextWithLinks(post.text)}</span>
                    </div>
                )}

                {/* View Comments */}
                {post.commentsCount > 0 && (
                    <button
                        onClick={() => onCommentClick(post)}
                        className="text-gray-500 text-[13px] font-normal cursor-pointer active:opacity-70 block mt-1"
                    >
                        View all {post.commentsCount} comments
                    </button>
                )}

                {/* Add Comment Input (Visual Only) */}
                {/* <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 rounded-full bg-gray-800" />
                    <span className="text-gray-500 text-[13px]">Add a comment...</span>
                </div> */}
            </div>
        </div>
    );
};

export default PostCard;
