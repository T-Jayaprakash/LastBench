
import React, { useRef, useCallback } from 'react';
import { useFeed } from '../src/hooks/useFeed';
import PostCard from './PostCard';
import { User, Post } from '../types';

interface FeedProps {
    user: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onViewImages: (images: string[], index: number) => void;
    newPost?: Post | null;
    deletedPostId?: string | null;
    updatedPost?: Post | null;
    variant?: 'default' | 'fullscreen';
}

const Feed: React.FC<FeedProps> = ({
    user,
    onCommentClick,
    onOptionsClick,
    onViewImages,
    newPost,
    deletedPostId,
    updatedPost,
    variant = 'default'
}) => {
    const { posts, setPosts, loading, hasMore, loadMore, refresh, refreshing } = useFeed(user?.college, user?.userId);
    const observer = useRef<IntersectionObserver | null>(null);

    // Handle new post from App (e.g. created via CreatePostView)
    React.useEffect(() => {
        if (newPost) {
            setPosts(prev => {
                if (prev.find(p => p.id === newPost.id)) return prev;
                return [newPost, ...prev];
            });
        }
    }, [newPost, setPosts]);

    // Handle deleted post
    React.useEffect(() => {
        if (deletedPostId) {
            setPosts(prev => prev.filter(p => p.id !== deletedPostId));
        }
    }, [deletedPostId, setPosts]);

    // Handle updated post
    React.useEffect(() => {
        if (updatedPost) {
            setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
        }
    }, [updatedPost, setPosts]);

    // Infinite Scroll Intersection Observer
    const lastPostRef = useCallback((node: HTMLDivElement) => {
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
        // Optimistic UI Update
        setPosts(prev => prev.map(post => {
            if (post.id === postId && post.poll) {
                // Check if already voted (double safety)
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
            // Revert would be complex, let's just alert
            refresh();
        }
    };

    const containerStyle = variant === 'fullscreen'
        ? "h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black"
        : "flex flex-col w-full pb-20";

    const itemStyle = variant === 'fullscreen'
        ? "w-full h-full snap-start"
        : "border-b border-white/5"; // Separator line for home feed

    return (
        <div className={containerStyle}>
            {posts.filter(p => !p.hiddenFromFeed).map((post, index) => (
                <div key={post.id} ref={index === posts.length - 1 ? lastPostRef : null} className={itemStyle}>
                    <PostCard
                        post={post}
                        index={index}
                        currentUser={user}
                        onCommentClick={onCommentClick}
                        onOptionsClick={onOptionsClick}
                        onImageClick={onViewImages}
                        onVote={handleVote}
                        variant={variant}
                    />
                </div>
            ))}

            {loading && (
                <div className={`p-4 flex justify-center ${variant === 'fullscreen' ? 'snap-start' : ''}`}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className={`p-8 text-center text-gray-500 text-sm ${variant === 'fullscreen' ? 'snap-start' : ''}`}>
                    You're all caught up! 🎉
                </div>
            )}

            {!loading && posts.length === 0 && (
                <div className="flex flex-col items-center justify-center p-10 text-gray-500 mt-10">
                    <p>No posts yet in {user?.college}</p>
                    <p className="text-sm mt-2">Be the first to confess!</p>
                </div>
            )}
        </div>
    );
};

export default Feed;

