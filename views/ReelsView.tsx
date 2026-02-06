
import React, { useState, useEffect, useRef } from 'react';
import { Post, User } from '../types/index';
import * as api from '../services/api';
import PostCard from '../components/PostCard';
import { useFeed } from '../src/hooks/useFeed';

interface ReelsViewProps {
    user: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onViewImages: (images: string[], index: number) => void;
}

const ReelsView: React.FC<ReelsViewProps> = ({ user, onCommentClick, onOptionsClick, onViewImages }) => {
    // Only show posts that have images as reels/fullscreen posts
    const { posts, loading, loadMore, hasMore, refresh } = useFeed(user?.college || null, user?.userId || null);
    const [reels, setReels] = useState<Post[]>([]);

    useEffect(() => {
        // Filter for posts with images or high engagement for "Reels" feel
        // For now, just show all posts in fullscreen mode
        if (posts.length > 0) {
            setReels(posts);
        }
    }, [posts]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !loading) {
            loadMore();
        }
    };

    return (
        <div
            className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black"
            onScroll={handleScroll}
        >
            {reels.map((post, index) => (
                <div key={`${post.id}-${index}`} className="h-full w-full snap-start flex items-center justify-center">
                    <PostCard
                        post={post}
                        index={index}
                        currentUser={user}
                        onCommentClick={onCommentClick}
                        onOptionsClick={onOptionsClick}
                        onImageClick={onViewImages}
                        variant="fullscreen"
                    />
                </div>
            ))}

            {loading && (
                <div className="h-full w-full snap-start flex items-center justify-center bg-black">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default ReelsView;
