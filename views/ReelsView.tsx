import React from 'react';
import Feed from '../components/Feed';
import { User, Post } from '../types';

interface ReelsViewProps {
    user: User | null;
    onCommentClick: (post: Post) => void;
    onOptionsClick: (post: Post) => void;
    onViewImages: (images: string[], index: number) => void;
}

const ReelsView: React.FC<ReelsViewProps> = ({
    user,
    onCommentClick,
    onOptionsClick,
    onViewImages,
}) => {
    return (
        <div className="flex flex-col h-full bg-black relative">
            <div className="absolute top-4 left-4 z-40">
                <h1 className="text-white font-bold text-xl drop-shadow-md">Reels</h1>
            </div>

            <div className="h-full w-full pt-0">
                <Feed
                    user={user}
                    onCommentClick={onCommentClick}
                    onOptionsClick={onOptionsClick}
                    onViewImages={onViewImages}
                    variant="fullscreen"
                />
            </div>
        </div>
    );
};

export default ReelsView;
