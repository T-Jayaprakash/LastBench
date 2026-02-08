import React, { useState } from 'react';
import Header from '../components/Header';
import Feed from '../components/Feed';
import AdvertisingBanner from '../components/AdvertisingBanner';
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
    onBannerClick?: (post: Post) => void;
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
    onShareSuccess,
    onBannerClick
}) => {
    return (
        <div className="flex flex-col h-full bg-black relative">
            <div className="h-full w-full pt-0 overflow-y-auto no-scrollbar" id="feed-container">

                <AdvertisingBanner onPostClick={(post) => {
                    if (onBannerClick) onBannerClick(post);
                    else onCommentClick(post);
                }} />

                {/* College Header */}
                <div className="px-4 py-3 bg-black border-b border-white/5">
                    <h2 className="text-white font-bold text-xl leading-tight">
                        {user?.college || 'Your Campus'}
                    </h2>
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mt-1">
                        Verified Campus Updates
                    </p>
                </div>

                <div className="h-2 bg-black"></div>
                <Feed
                    user={user}
                    onCommentClick={onCommentClick}
                    onOptionsClick={onOptionsClick}
                    onViewImages={onViewImages}
                    newPost={newPost}
                    deletedPostId={deletedPostId}
                    updatedPost={updatedPost}
                    variant="default"
                />
            </div>
        </div>
    );
};

export default HomeFeed;
