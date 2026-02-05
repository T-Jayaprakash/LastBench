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
    onImageClick,
    onVote
}) => {
    const [isLiked, setIsLiked] = useState(post.isLiked);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

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
        <div className="w-full bg-black border-b border-white/5 py-4">
            {/* Header */}
            <div className="px-4 flex justify-between items-center mb-2">
                <div className="flex gap-3 items-center">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ring-1 ring-white/10"
                        style={{ backgroundColor: post.authorAvatarColor || '#262626' }}
                    >
                        {post.authorAvatarUrl ? (
                            <img src={post.authorAvatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            (post.displayName || 'A').charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className="font-semibold text-white text-[13px] leading-tight flex items-center gap-1">
                            {post.displayName}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                            {post.department && <span>{post.department}</span>}
                            {post.department && <span>•</span>}
                            <span>{timeAgo(post.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => onOptionsClick(post)} className="text-gray-500 p-1">
                    <ThreeDotsIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            {post.text && (
                <div className="px-4 mb-3">
                    <p className="text-[#F5F5F5] text-[15px] leading-relaxed whitespace-pre-wrap font-sans font-medium">
                        {renderTextWithLinks(post.text)}
                    </p>
                </div>
            )}

            {/* Polls UI - WhatsApp Style */}
            {post.poll && (
                <div className="px-4 mb-4">
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
                                    className="relative w-full h-10 rounded-lg overflow-hidden bg-[#1F2937] border border-gray-700 transition-all active:scale-[0.99]"
                                >
                                    {/* Progress Bar */}
                                    <div
                                        className={`absolute top-0 left-0 h-full transition-all duration-500 ${isVoted ? 'bg-green-900/50' : 'bg-gray-700/50'}`}
                                        style={{ width: `${percentage}%` }}
                                    />

                                    {/* Content */}
                                    <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                                        <span className="text-sm font-medium text-white">{option.text}</span>
                                        <span className="text-xs text-gray-400 font-bold">{percentage}%</span>
                                    </div>

                                    {/* Checkmark for voted */}
                                    {isVoted && (
                                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                        <div className="text-[11px] text-gray-500 pl-1 mt-1">
                            {post.poll.totalVotes} votes
                        </div>
                    </div>
                </div>
            )}

            {/* Image Slider / Carousel */}
            {hasImages && (
                <div className="relative mb-3">
                    {/* Scroll Container */}
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

                    {/* Minimal Dots (Instagram Style) */}
                    {post.images!.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
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

                    {/* Count Badge (Top Right) */}
                    {post.images!.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-md pointer-events-none">
                            {activeImageIndex + 1}/{post.images!.length}
                        </div>
                    )}
                </div>
            )}

            {/* Actions - Interaction Row Lock */}
            <div className="px-4 flex items-center justify-start mt-1">
                <div className="flex items-center gap-5">
                    {/* Like */}
                    <button
                        onClick={handleLike}
                        className="flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                        <HeartIcon
                            className={`w-[26px] h-[26px] stroke-[1.5px] ${isLiked ? 'fill-[#FF3040] text-[#FF3040]' : 'text-white fill-none'}`}
                        />
                        {likesCount > 0 && (
                            <span className="text-[13px] font-semibold text-white min-w-[10px]">{likesCount}</span>
                        )}
                    </button>

                    {/* Comment */}
                    <button
                        onClick={() => onCommentClick(post)}
                        className="flex items-center gap-1.5 text-white transition-opacity hover:opacity-70 active:scale-95"
                    >
                        <ChatBubbleOvalLeftIcon className="w-[24px] h-[24px] stroke-[1.5px] -rotate-90" style={{ transform: 'scaleX(-1)' }} />
                        {post.commentsCount > 0 && (
                            <span className="text-[13px] font-semibold text-white">{post.commentsCount}</span>
                        )}
                    </button>

                    {/* Share */}
                    <button
                        onClick={handleShare}
                        className="flex items-center text-white transition-opacity hover:opacity-70 active:scale-95"
                    >
                        <ShareIcon className="w-[24px] h-[24px] stroke-[1.5px]" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostCard;
