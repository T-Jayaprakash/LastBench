
export type PostTag = 'Confess' | 'Roast' | 'Meme' | 'Love' | 'Dept' | 'Other';

export type View = 'home' | 'reels' | 'create' | 'profile' | 'notifications' | 'saved' | 'settings' | 'debate';

export interface Debate {
    id: string;
    topic: string;
    college: string;
    createdBy: string;
    isActive: boolean;
    createdAt: Date;
    totalTakes: number;
}

export interface DebateTake {
    id: string;
    debateId: string;
    authorAnonId: string;
    authorAvatarColor: string;
    text: string;
    type: 'text' | 'emoji';
    upvotes: number;
    downvotes: number;
    userVote?: 'up' | 'down' | null;
    createdAt: Date;
}

export type Theme = 'light' | 'dark';

export interface Post {
    id: string;
    authorAnonId: string;
    displayName: string;
    authorAvatarColor: string;
    authorAvatarUrl?: string;
    text: string;
    imageUrl?: string; // Kept for backward compatibility (represents the first image)
    thumbPath?: string; // Optimized thumbnail path
    images?: string[]; // Array of all image URLs
    department?: string;
    college?: string;
    tags: PostTag[];
    likesCount: number;
    commentsCount: number;
    sharesCount?: number; // Number of times this post was shared
    createdAt: Date;
    trendingScore: number;
    isLiked?: boolean; // Whether the current user has liked this post
    isBookmarked?: boolean; // Whether the current user has saved this post
    isBanner?: boolean; // Whether this post is promoted to the banner
    bannerExpiresAt?: Date; // When the banner promotion expires (default 24h)
    title?: string;
    hiddenFromFeed?: boolean;
    poll?: Poll;
}

export interface PollOption {
    id: string;
    text: string;
    voteCount: number;
}

export interface Poll {
    id: string; // usually same as post id or separate UID
    question: string;
    options: PollOption[];
    totalVotes: number;
    userVotedOptionId?: string | null; // The option ID the current user voted for, if any
    allowMultipleAnswers?: boolean; // WhatsApp style allows multiple
    votingEndsAt?: Date; // Optional expiry
}

export interface User {
    userId: string;
    anonId: string;
    displayName: string;
    department: string;
    avatarColor: string;
    avatarUrl?: string;
    college?: string;
    hasOnboarded: boolean;
}

export interface Comment {
    id: string;
    postId: string;
    parentId?: string | null;
    authorAnonId: string;
    displayName?: string; // Added for consistency
    authorAvatarColor: string;
    authorAvatarUrl?: string;
    text: string;
    likesCount: number;
    repliesCount?: number; // Number of replies to this comment
    isLiked?: boolean;
    createdAt: Date;
}

export interface Bookmark {
    id: string;
    userId: string;
    postId: string;
    createdAt: Date;
}