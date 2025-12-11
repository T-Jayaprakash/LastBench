
import React, { useState, useEffect, useRef } from 'react';
import { Post, Comment } from '../types/index';
import { t } from '../constants/locales';
import * as api from '../services/api';
import { XMarkIcon, HeartIcon } from '../components/Icons';
import { useSupabaseRealtimeFiltered } from '../src/hooks/useSupabaseRealtime';
import { mergeRealtimeInsert } from '../src/utils/realtimeUtils';

interface CommentViewProps {
    post: Post;
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
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, replies, allComments, onReply, newlyAddedId }) => {
    const [avatarError, setAvatarError] = useState(false);
    const [isLiked, setIsLiked] = useState(comment.isLiked || false);
    const [likesCount, setLikesCount] = useState(comment.likesCount);

    const handleLike = async () => {
        const newState = !isLiked;
        setIsLiked(newState);
        setLikesCount(prev => newState ? prev + 1 : Math.max(0, prev - 1));

        try {
            const newCount = await api.toggleCommentLike(comment.id);
            // Only update count if returned, but keep optimistic liked state unless error
            if (newCount !== undefined) setLikesCount(newCount);
        } catch (e) {
            // Revert
            setIsLiked(!newState);
            setLikesCount(prev => newState ? prev - 1 : prev + 1);
        }
    };

    const isNewlyAdded = comment.id === newlyAddedId;

    return (
        <div className={`flex flex-col ${isNewlyAdded ? 'animate-slide-in-bottom-fade' : ''}`}>
            <div className="flex items-start space-x-3 py-2">
                {/* Avatar */}
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 text-white overflow-hidden bg-gray-300"
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
                        <span className="opacity-50">{(comment.authorAnonId || 'A').charAt(0)}</span>
                    )}
                </div>

                {/* Content */}
                <div className="flex-grow text-sm">
                    <div className="flex flex-col">
                        <p className="text-primary-text dark:text-dark-primary-text leading-snug">
                            <span className="font-bold mr-2">{comment.displayName || comment.authorAnonId}</span>
                            {comment.text}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-secondary-text dark:text-dark-secondary-text">
                            <span>{timeAgo(comment.createdAt)}</span>
                            {likesCount > 0 && <span>{likesCount} likes</span>}
                            <button
                                onClick={() => onReply(comment)}
                                className="font-semibold text-secondary-text dark:text-dark-secondary-text hover:text-primary-text dark:hover:text-dark-primary-text"
                            >
                                Reply
                            </button>
                        </div>
                    </div>
                </div>

                {/* Like Button */}
                <div className="flex flex-col items-center pt-1">
                    <button onClick={handleLike} className="p-1 active:scale-75 transition-transform">
                        <HeartIcon
                            className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-secondary-text dark:text-dark-secondary-text'}`}
                        />
                    </button>
                </div>
            </div>

            {/* Render Replies recursively */}
            {replies.length > 0 && (
                <div className="pl-11 space-y-2">
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
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const CommentView: React.FC<CommentViewProps> = ({ post, onBack }) => {
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

    // Realtime subscription for new comments
    useSupabaseRealtimeFiltered({
        table: 'comments',
        filter: `post_id=eq.${post.id}`,
        callback: (payload) => {
            if (payload.eventType === 'INSERT' && payload.new) {
                const newCommentRaw = payload.new;
                // Transform raw comment data to Comment type
                const newCommentData: Comment = {
                    id: newCommentRaw.id,
                    postId: newCommentRaw.post_id,
                    parentId: newCommentRaw.parent_id || null,
                    authorAnonId: 'New User',
                    displayName: 'New User', // Placeholder
                    authorAvatarColor: '#667eea',
                    authorAvatarUrl: undefined,
                    text: newCommentRaw.text,
                    likesCount: newCommentRaw.likes_count || 0,
                    isLiked: false,
                    createdAt: new Date(newCommentRaw.created_at),
                };

                setComments(prev => {
                    // Avoid duplicates
                    if (prev.some(c => c.id === newCommentData.id)) {
                        return prev;
                    }
                    return [...prev, newCommentData];
                });

                // Vibrate on new comment
                if ('vibrate' in navigator) {
                    navigator.vibrate(30);
                }
            }
        },
        events: ['INSERT'],
        debounceMilliseconds: 100
    });

    // Scroll to bottom on new TOP LEVEL comment
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
            // Strip @username from text for the actual comment payload if desired, 
            // but typically keeping it is fine for context.

            const addedComment = await api.addComment(post.id, newComment, parentId);

            setComments(prev => [...prev, addedComment]);
            setNewlyAddedCommentId(addedComment.id);
            setNewComment('');
            setReplyingTo(null); // Reset reply state
        } catch (error) {
            console.error("Failed to post comment:", JSON.stringify(error, null, 2));
        } finally {
            setIsPosting(false);
        }
    }

    const handleReplyClick = (comment: Comment) => {
        setReplyingTo(comment);
        setNewComment(`@${comment.authorAnonId} `);
        inputRef.current?.focus();
    };

    // Group comments into trees
    const rootComments = comments.filter(c => !c.parentId);

    return (
        <div
            className="fixed inset-0 bg-black/60 z-20 flex items-end animate-fade-in"
            onClick={onBack}
            aria-modal="true"
            role="dialog"
        >
            <div
                className="bg-card-bg dark:bg-dark-card-bg w-full max-h-[90vh] h-[90vh] rounded-t-2xl flex flex-col animate-slide-in-up shadow-2xl shadow-black/50"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex-shrink-0 text-center py-3 border-b border-border-color dark:border-dark-border-color relative">
                    <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2" aria-hidden="true"></div>
                    <h2 className="text-lg font-bold">{t.comments}</h2>
                    <button onClick={onBack} className="absolute top-1/2 -translate-y-1/2 right-4 text-secondary-text dark:text-dark-secondary-text hover:text-primary-text dark:hover:text-dark-primary-text" aria-label="Close comments">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Content */}
                <div className="flex-grow overflow-y-auto px-4" ref={commentsListRef}>
                    {/* Original Post Caption */}
                    <div className="flex items-start space-x-3 py-4 border-b border-border-color dark:border-dark-border-color">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white overflow-hidden bg-gray-300"
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
                        <div className="text-sm">
                            <p className="text-primary-text dark:text-dark-primary-text leading-snug">
                                <span className="font-bold mr-2">{post.displayName}</span>
                                {post.text}
                            </p>
                            <p className="text-xs text-secondary-text dark:text-dark-secondary-text mt-1.5">{timeAgo(post.createdAt)}</p>
                        </div>
                    </div>

                    {/* Comments List */}
                    {loading ? (
                        <p className="text-secondary-text dark:text-dark-secondary-text text-center pt-10">Loading comments...</p>
                    ) : (
                        <div className="pt-2 pb-4 space-y-2">
                            {rootComments.map(comment => {
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
                            })}
                        </div>
                    )}
                </div>

                {/* Comment Input Footer */}
                <div className="flex-shrink-0 bg-card-bg dark:bg-dark-card-bg border-t border-border-color dark:border-dark-border-color">
                    {replyingTo && (
                        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 flex justify-between items-center text-xs text-secondary-text dark:text-dark-secondary-text">
                            <span>Replying to <span className="font-bold">{replyingTo.displayName || replyingTo.authorAnonId}</span></span>
                            <button onClick={() => { setReplyingTo(null); setNewComment(''); }} className="text-primary-text dark:text-dark-primary-text font-semibold">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="p-3">
                        <form onSubmit={(e) => { e.preventDefault(); handlePostComment(); }} className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-500 rounded-full flex-shrink-0 opacity-20" aria-hidden="true"></div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={replyingTo ? `Reply to ${replyingTo.displayName || replyingTo.authorAnonId}...` : t.addCommentPlaceholder}
                                className="flex-grow bg-gray-100 dark:bg-dark-border-color border border-border-color dark:border-dark-border-color rounded-full py-2 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary"
                                aria-label="Add a comment"
                            />
                            <button type="submit" disabled={!newComment.trim() || isPosting} className="text-accent-primary font-bold text-sm disabled:text-secondary-text dark:disabled:text-dark-secondary-text transition-colors">
                                {t.postComment}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentView;
