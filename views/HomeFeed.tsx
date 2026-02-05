import React from 'react';
import Header from '../components/Header';
import Feed from '../components/Feed';
import { User, Post, PostTag } from '../types';

interface HomeFeedProps {
    user: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onViewImages: (images: string[], index: number) => void;
    newPost: Post | null;
    deletedPostId: string | null;
    updatedPost: Post | null;
    onNotificationClick: () => void;
    onShareSuccess: (message: string) => void;
}

const HomeFeed: React.FC<HomeFeedProps> = ({
    user,
    onCommentClick,
    onOptionsClick,
    onViewImages,
    newPost,
    deletedPostId,
    updatedPost,
    onNotificationClick,
    onShareSuccess
}) => {
    return (
        <div className="flex flex-col h-full bg-black relative">
            <Header user={user} onNotificationClick={onNotificationClick} />

            <div className="flex-1 overflow-y-auto pt-12 no-scrollbar scroll-smooth" id="feed-container">
                <Feed
                    user={user}
                    onCommentClick={onCommentClick}
                    onOptionsClick={onOptionsClick}
                    onViewImages={onViewImages}
                    newPost={newPost}
                    deletedPostId={deletedPostId}
                    updatedPost={updatedPost}
                />
            </div>
        </div>
    );
};

export default HomeFeed;
