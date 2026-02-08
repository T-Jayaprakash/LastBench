

import React, { useState, useEffect, useRef } from 'react';
import { Post, Comment, User } from '../types/index';
import { t } from '../constants/locales';
import * as api from '../services/api';
import { ArrowLeftIcon, HeartIcon } from '../components/Icons';
import { useFirestoreCollection } from '../src/hooks/useFirebaseRealtime';
import { where, orderBy } from 'firebase/firestore';


interface CommentViewProps {
    post: Post;
    currentUser: User | null;
    onBack: () => void;
}

const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "w";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return "now";
};

// Individual Comment Component with Nesting
interface CommentItemProps {
    comment: Comment;
    replies: Comment[];
    allComments: Comment[];
    onReply: (comment: Comment) => void;
    newlyAddedId: string | null;
    isReply?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, replies, allComments, onReply, newlyAddedId, isReply = false }) => {
    const [avatarError, setAvatarError] = useState(false);
    const [isLiked, setIsLiked] = useState(comment.isLiked || false);
    const [likesCount, setLikesCount] = useState(comment.likesCount);

    const handleLike = async () => {
        const newState = !isLiked;
        setIsLiked(newState);
        setLikesCount(prev => newState ? prev + 1 : Math.max(0, prev - 1));

        try {
            const newCount = await api.toggleCommentLike(comment.id);
            if (newCount !== undefined) setLikesCount(newCount);
        } catch (e) {
            setIsLiked(!newState);
            setLikesCount(prev => newState ? prev - 1 : prev + 1);
        }
    };

    const isNewlyAdded = comment.id === newlyAddedId;

    return (
        <div className={`flex flex-col w-full ${isNewlyAdded ? 'animate-fade-in' : ''}`}>
            {/* Comment Row */}
            <div className={`flex gap-3 py-3 px-4 w-full ${isReply ? 'pl-4' : ''}`}>
                {/* Avatar */}
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 text-white overflow-hidden ring-1 ring-white/10"
                    style={{ backgroundColor: (comment.authorAvatarUrl && !avatarError) ? 'transparent' : comment.authorAvatarColor }}
                >
                    {comment.authorAvatarUrl && !avatarError ? (
                        <img
                            src={comment.authorAvatarUrl}
                            alt={comment.authorAnonId}
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                        />
                    ) : (
                        <span className="opacity-70">{(comment.authorAnonId || 'A').charAt(0)}</span>
                    )}
                </div>

                {/* Content Block */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                        {/* Username & Text Inline-ish */}
                        <div className="text-[14px] leading-relaxed text-white">
                            <span className="font-semibold mr-2 text-[13px]">{comment.displayName || comment.authorAnonId}</span>
                            <span className="text-gray-200 font-normal">{comment.text}</span>
                        </div>

                        {/* Meta Row: Time · Reply · Likes */}
                        <div className="flex items-center gap-4 mt-1.5 text-[12px] text-gray-500 font-medium">
                            <span>{timeAgo(comment.createdAt)}</span>
                            {likesCount > 0 && (
                                <span>{likesCount} like{likesCount !== 1 ? 's' : ''}</span>
                            )}
                            <button
                                onClick={() => onReply(comment)}
                                className="text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                Reply
                            </button>
                        </div>
                    </div>
                </div>

                {/* Like Button (Right Side) */}
                <div className="pt-1">
                    <button
                        onClick={handleLike}
                        className="p-1 -mr-1 active:scale-90 transition-transform"
                    >
                        <HeartIcon
                            className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
                        />
                    </button>
                </div>
            </div>

            {/* Nested Replies */}
            {replies.length > 0 && (
                <div className="pl-11">
                    {/* Visual Thread Guide (Optional, but Instagram doesn't use it, Reddit does. Let's keep it clean for now) */}
                    {replies.map(reply => {
                        const nestedReplies = allComments.filter(c => c.parentId === reply.id);
                        return (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                replies={nestedReplies}
                                allComments={allComments}
                                onReply={onReply}
                                newlyAddedId={newlyAddedId}
                                isReply={true}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const CommentView: React.FC<CommentViewProps> = ({ post, currentUser, onBack }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [newlyAddedCommentId, setNewlyAddedCommentId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

    const commentsListRef = useRef<HTMLDivElement>(null);
    const [postAvatarError, setPostAvatarError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchComments = async () => {
            setLoading(true);
            const fetchedComments = await api.getComments(post.id);
            setComments(fetchedComments);
            setLoading(false);
        };
        fetchComments();
    }, [post.id]);

    useFirestoreCollection({
        collectionName: 'comments',
        constraints: [
            where('post_id', '==', post.id),
            // orderBy('created_at', 'desc'), // Removed to avoid index issues, sorting client-side
        ],
        onChange: (changes) => {
            changes.forEach(change => {
                if (change.type === 'added') {
                    const newCommentRaw = change.doc.data;
                    const newCommentData: Comment = {
                        id: change.doc.id,
                        postId: newCommentRaw.post_id,
                        parentId: newCommentRaw.parent_id || null,
                        authorAnonId: newCommentRaw.author_anon_id || 'New User',
                        displayName: newCommentRaw.display_name || 'New User',
                        authorAvatarColor: newCommentRaw.avatar_color || '#667eea',
                        authorAvatarUrl: newCommentRaw.avatar_url,
                        text: newCommentRaw.text,
                        likesCount: newCommentRaw.likes_count || 0,
                        isLiked: false,
                        createdAt: newCommentRaw.created_at?.toDate?.() || new Date(newCommentRaw.created_at) || new Date(),
                    };

                    setComments(prev => {
                        if (prev.some(c => c.id === newCommentData.id)) return prev;
                        return [...prev, newCommentData].sort((a, b) =>
                            a.createdAt.getTime() - b.createdAt.getTime()
                        );
                    });

                    if ('vibrate' in navigator) navigator.vibrate(30);
                }
            });
        },
        debounceMilliseconds: 100
    });

    useEffect(() => {
        if (newlyAddedCommentId && !replyingTo) {
            commentsListRef.current?.scrollTo({ top: commentsListRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [comments, newlyAddedCommentId, replyingTo]);

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        setIsPosting(true);
        try {
            const parentId = replyingTo ? replyingTo.id : undefined;
            const addedComment = await api.addComment(post.id, newComment, parentId);
            // setComments is handled by real-time listener to avoid duplicates
            // setComments(prev => [...prev, addedComment]);
            setNewlyAddedCommentId(addedComment.id);
            setNewComment('');
            setReplyingTo(null);
        } catch (error) {
            console.error("Failed to post comment:", error);
        } finally {
            setIsPosting(false);
        }
    }

    const handleReplyClick = (comment: Comment) => {
        setReplyingTo(comment);
        setNewComment(`@${comment.authorAnonId} `);
        inputRef.current?.focus();
    };

    const rootComments = comments.filter(c => !c.parentId);

    return (
        <div
            className="fixed inset-0 bg-black z-50 flex flex-col animate-slide-in-right"
            aria-modal="true"
            role="dialog"
        >
            {/* Header Removed as requested - relies on gesture/hardware back */}
            <div className="pt-4"></div>

            {/* Content Scroller */}
            <div className="flex-grow overflow-y-auto bg-black pb-20 no-scrollbar" ref={commentsListRef}>
                {/* Original Post Context */}
                <div className="flex items-start gap-3 py-4 px-4 border-b border-white/5">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 text-white overflow-hidden ring-1 ring-white/10"
                        style={{ backgroundColor: (post.authorAvatarUrl && !postAvatarError) ? 'transparent' : post.authorAvatarColor }}
                    >
                        {post.authorAvatarUrl && !postAvatarError ? (
                            <img
                                src={post.authorAvatarUrl}
                                alt={post.displayName}
                                className="w-full h-full object-cover"
                                onError={() => setPostAvatarError(true)}
                            />
                        ) : (
                            (post.displayName || 'A').charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[14px] leading-relaxed text-white">
                            <span className="font-semibold mr-2 text-[13px]">{post.displayName}</span>
                            <span className="text-gray-200 font-normal">{post.text}</span>
                        </div>

                        {/* Post Image */}
                        {(post.imageUrl || (post.images && post.images.length > 0)) && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-white/10 bg-[#121212]">
                                <img
                                    src={post.imageUrl || post.images![0]}
                                    alt="Post"
                                    className="w-full h-auto object-cover max-h-[500px]"
                                />
                            </div>
                        )}

                        <p className="text-[11px] text-gray-500 mt-2 font-medium">{timeAgo(post.createdAt)}</p>
                    </div>
                </div>

                {/* Comments List */}
                {loading ? (
                    <div className="flex justify-center pt-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/30"></div>
                    </div>
                ) : (
                    <div className="divide-y divide-transparent">
                        {rootComments.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-gray-600 text-sm">No comments yet.</p>
                                <p className="text-gray-700 text-xs mt-1">Start the conversation.</p>
                            </div>
                        ) : (
                            rootComments.map(comment => {
                                const replies = comments.filter(c => c.parentId === comment.id);
                                return (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        replies={replies}
                                        allComments={comments}
                                        onReply={handleReplyClick}
                                        newlyAddedId={newlyAddedCommentId}
                                    />
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Input Fixed Bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 p-3 pb-safe-area-bottom">
                {replyingTo && (
                    <div className="px-1 pb-2 flex justify-between items-center text-xs text-gray-400">
                        <span>Replying to <span className="font-bold text-white">{replyingTo.displayName}</span></span>
                        <button onClick={() => { setReplyingTo(null); setNewComment(''); }} className="text-white p-1">
                            ✕
                        </button>
                    </div>
                )}
                <form
                    onSubmit={(e) => { e.preventDefault(); handlePostComment(); }}
                    className="flex items-center gap-3"
                >
                    {/* Current User Avatar Placeholder */}
                    <div className="w-8 h-8 bg-gray-800 rounded-full flex-shrink-0" />

                    <div className="flex-grow relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={replyingTo ? "Write a reply..." : `Add a comment...`}
                            className="w-full bg-[#121212] border border-white/10 rounded-full py-2.5 px-4 text-[14px] text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newComment.trim() || isPosting}
                        className="text-[#0095F6] font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-opacity px-1"
                    >
                        Post
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CommentView;
