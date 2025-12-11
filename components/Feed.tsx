import React, { useRef, useCallback } from 'react';
import { useFeed } from '../hooks/useFeed';
import PostCard from './PostCard';
import { User, Post } from '../types';

interface FeedProps {
    user: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onViewImages: (images: string[], index: number) => void;
}

const Feed: React.FC<FeedProps> = ({ user, onCommentClick, onOptionsClick, onViewImages }) => {
    const { posts, loading, hasMore, loadMore, refresh, refreshing } = useFeed(user?.college);
    const observer = useRef<IntersectionObserver | null>(null);

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

    return (
        <div className="flex flex-col w-full">
            {/* Pull to refresh visualization would need to happen in parent or here */}

            {posts.map((post, index) => (
                <div key={post.id} ref={index === posts.length - 1 ? lastPostRef : null}>
                    <PostCard
                        post={post}
                        index={index}
                        currentUser={user}
                        onCommentClick={onCommentClick}
                        onOptionsClick={onOptionsClick}
                        onImageClick={onViewImages}
                    />
                </div>
            ))}

            {loading && (
                <div className="p-4 flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                    You're all caught up! 🎉
                </div>
            )}

            {!loading && posts.length === 0 && (
                <div className="flex flex-col items-center justify-center p-10 text-gray-500">
                    <p>No posts yet.</p>
                </div>
            )}
        </div>
    );
};

export default Feed;
