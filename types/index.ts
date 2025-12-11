
export type PostTag = 'Confess' | 'Roast' | 'Meme' | 'Love' | 'Dept' | 'Other';

export type View = 'home' | 'create' | 'profile' | 'notifications';

export type Theme = 'light' | 'dark';

export interface Post {
    id: string;
    authorAnonId: string;
    displayName: string;
    authorAvatarColor: string;
    authorAvatarUrl?: string;
    text: string;
    imageUrl?: string; // Kept for backward compatibility (represents the first image)
    images?: string[]; // Array of all image URLs
    department?: string;
    tags: PostTag[];
    likesCount: number;
    commentsCount: number;
    createdAt: Date;
    trendingScore: number;
    isLiked?: boolean; // Whether the current user has liked this post
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
    isLiked?: boolean;
    createdAt: Date;
}