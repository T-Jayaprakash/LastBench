
import React, { useState, useEffect, useRef } from 'react';
import { Post, User, Theme } from '../types/index';
import * as api from '../services/api';
import { uploadAvatar } from '../services/userService';
import { t } from '../constants/locales';
import { PencilIcon, CameraIcon, TrashIcon, CogIcon, ArrowRightOnRectangleIcon, ArrowLeftIcon, GridIcon, XMarkIcon } from '../components/Icons';
import { DEPARTMENTS, AVATAR_COLORS } from '../constants/config';
import PostCard from '../components/PostCard';
import { useToast } from '../components/Toast';

interface ProfileViewProps {
    user: User | null;
    onUpdateUser: (user: User) => void;
    theme: Theme;
    toggleTheme: () => void;
    onSettingsClick: () => void;
    onLogout?: () => void;
    onViewImages: (images: string[], index: number) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, theme, toggleTheme, onSettingsClick, onViewImages }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Grid/Feed View toggle
    const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
    const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);

    const [editedName, setEditedName] = useState(user?.displayName || '');
    const [editedDept, setEditedDept] = useState(user?.department || '');
    const [editedColor, setEditedColor] = useState(user?.avatarColor || AVATAR_COLORS[0]);
    const [editedAvatarUrl, setEditedAvatarUrl] = useState<string | undefined>(user?.avatarUrl);
    const [imgError, setImgError] = useState(false);

    const [customDept, setCustomDept] = useState('');
    const [isOtherDept, setIsOtherDept] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const feedScrollRef = useRef<HTMLDivElement>(null);
    const { showToast } = useToast();

    useEffect(() => {
        if (user && isEditing) {
            setEditedName(user.displayName);
            setEditedColor(user.avatarColor);
            setEditedAvatarUrl(user.avatarUrl);
            setImgError(false);

            const isStandardDept = DEPARTMENTS.some(d => d === user.department);
            if (isStandardDept) {
                setEditedDept(user.department);
                setIsOtherDept(false);
                setCustomDept('');
            } else {
                setEditedDept('Other');
                setIsOtherDept(true);
                setCustomDept(user.department);
            }
        }
    }, [user, isEditing]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        // Using real-time subscription for profile posts
        const unsubscribe = api.subscribeToUserPosts(user.userId, (newPosts) => {
            setPosts(newPosts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Scroll to selected post when opening feed view
    useEffect(() => {
        if (viewMode === 'feed' && selectedPostIndex !== null && feedScrollRef.current) {
            const postElements = feedScrollRef.current.querySelectorAll('[data-post-index]');
            const targetPost = postElements[selectedPostIndex] as HTMLElement;
            if (targetPost) {
                targetPost.scrollIntoView({ behavior: 'instant', block: 'start' });
            }
        }
    }, [viewMode, selectedPostIndex]);

    if (!user) {
        return (
            <div className="flex items-center justify-center h-full bg-black">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const handleShareProfile = async () => {
        const profileUrl = `${window.location.origin}/?user=${user.userId}`;
        const shareText = `Check out ${user.displayName}'s profile on Genfess!`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Genfess Profile',
                    text: shareText,
                    url: profileUrl,
                });
                showToast('Profile shared successfully!', 'success');
            } catch (err) {
                console.error('Share failed', err);
            }
        } else {
            navigator.clipboard.writeText(`${shareText}\n${profileUrl}`);
            showToast('Profile link copied to clipboard!', 'success');
        }
    };

    const handleSave = () => {
        const finalDept = isOtherDept ? customDept.trim() : editedDept;
        if (!editedName.trim() || !finalDept) return;
        const updatedUser = {
            ...user,
            displayName: editedName.trim(),
            department: finalDept,
            avatarColor: editedColor,
            avatarUrl: editedAvatarUrl
        };
        onUpdateUser(updatedUser);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }
        setIsUploading(true);
        try {
            const url = await uploadAvatar(file);
            if (url) setEditedAvatarUrl(url);
        } catch (error) {
            console.error('Avatar upload failed:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleGridPostClick = (index: number) => {
        setSelectedPostIndex(index);
        setViewMode('feed');
    };

    const handleCloseFeed = () => {
        setViewMode('grid');
        setSelectedPostIndex(null);
    };

    // Placeholder handlers for PostCard since ProfileView is isolated here
    const handleCommentClick = (post: Post) => { console.log('Comment clicked', post.id); };
    const handleOptionsClick = (post: Post) => { console.log('Options clicked', post.id); };

    const currentAvatarUrl = isEditing ? editedAvatarUrl : user.avatarUrl;
    const currentAvatarColor = isEditing ? editedColor : user.avatarColor;
    const currentDisplayName = isEditing ? editedName : user.displayName;

    // Full-screen Feed View when a post is clicked
    if (viewMode === 'feed' && selectedPostIndex !== null) {
        return (
            <div className="fixed inset-0 z-50 bg-black animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 h-12 bg-black z-30 border-b border-white/5 sticky top-0">
                    <button
                        onClick={handleCloseFeed}
                        className="p-2 -ml-2 text-white hover:opacity-70"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-white font-semibold text-base">Posts</h1>
                    <div className="w-10" />
                </div>

                {/* Scrollable Feed */}
                <div
                    ref={feedScrollRef}
                    className="h-[calc(100vh-48px)] overflow-y-auto no-scrollbar"
                >
                    {posts.map((post, index) => (
                        <div key={post.id} data-post-index={index}>
                            <PostCard
                                post={post}
                                index={index}
                                currentUser={user}
                                onCommentClick={handleCommentClick}
                                onOptionsClick={handleOptionsClick}
                                onImageClick={onViewImages}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-black relative animate-fade-in">
            {/* Header - Silent & Native */}
            <div className="flex items-center justify-between px-4 h-12 sticky top-0 bg-black z-30 border-b border-white/5">
                <button className="p-1 -ml-1 text-white hover:opacity-70">
                    <ArrowLeftIcon className="w-6 h-6 stroke-[2px]" />
                </button>
                <div className="flex-1"></div>
                <button
                    onClick={onSettingsClick}
                    className="p-1 -mr-1 text-white hover:opacity-70"
                >
                    <CogIcon className="w-6 h-6 stroke-[2px]" />
                </button>
            </div>

            <div className="pb-20">
                {/* Identity Block */}
                <div className="px-5 pt-4 pb-6 flex flex-col items-center border-b border-white/5">
                    <div className="relative mb-3">
                        <div
                            className={`relative w-[86px] h-[86px] rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden ring-2 ring-black ${isEditing ? 'cursor-pointer opacity-80' : ''}`}
                            style={{ backgroundColor: (currentAvatarUrl && !imgError) ? 'transparent' : currentAvatarColor }}
                            onClick={() => isEditing && fileInputRef.current?.click()}
                        >
                            {currentAvatarUrl && !imgError ? (
                                <img
                                    src={currentAvatarUrl}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                (currentDisplayName || 'A').charAt(0).toUpperCase()
                            )}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <CameraIcon className="w-6 h-6 text-white" />
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                        />
                    </div>

                    {/* Name */}
                    <h1 className="text-white font-semibold text-[20px] leading-tight text-center">
                        {isEditing ? (
                            <input
                                value={editedName}
                                onChange={e => setEditedName(e.target.value)}
                                className="bg-transparent border-b border-white/20 text-center focus:outline-none"
                                placeholder="Username"
                            />
                        ) : user.displayName}
                    </h1>

                    <p className="text-gray-500 text-[14px] mt-1 text-center font-normal">
                        {user.department}
                    </p>

                    {/* Stats Row - Instagram Style */}
                    <div className="flex items-center justify-center gap-8 mt-4">
                        <div className="text-center">
                            <div className="text-white font-bold text-lg">{posts.length}</div>
                            <div className="text-gray-500 text-xs">posts</div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full mt-4 flex gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 bg-[#262626] text-white text-[14px] font-semibold py-1.5 rounded-lg active:scale-95 transition-transform"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-white text-black text-[14px] font-semibold py-1.5 rounded-lg active:scale-95 transition-transform"
                                >
                                    Save
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 bg-[#262626] text-white text-[14px] font-semibold py-1.5 rounded-lg active:scale-95 transition-transform border border-transparent hover:border-white/10"
                            >
                                Edit profile
                            </button>
                        )}

                        {!isEditing && (
                            <button
                                onClick={handleShareProfile}
                                className="bg-[#262626] text-white p-1.5 rounded-lg active:scale-95 transition-transform"
                            >
                                <span className="text-xs px-1">Share profile</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Bar - Grid Icon */}
                {!isEditing && (
                    <div className="flex items-center justify-center border-b border-white/5">
                        <button className="flex-1 py-3 flex items-center justify-center border-b-2 border-white">
                            <GridIcon className="w-6 h-6 text-white" />
                        </button>
                    </div>
                )}

                {/* Content Section - Instagram Grid Style */}
                {!isEditing && (
                    <div className="w-full">
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : posts.length > 0 ? (
                            <div className="grid grid-cols-3 gap-0.5">
                                {posts.map((post, index) => (
                                    <button
                                        key={post.id}
                                        onClick={() => handleGridPostClick(index)}
                                        className="aspect-square bg-[#1a1a1a] relative overflow-hidden group"
                                    >
                                        {post.images && post.images.length > 0 ? (
                                            <>
                                                <img
                                                    src={post.images[0]}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Multiple images indicator */}
                                                {post.images.length > 1 && (
                                                    <div className="absolute top-2 right-2">
                                                        <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </>
                                        ) : post.poll ? (
                                            // Poll indicator
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-purple-600 p-3">
                                                <svg className="w-8 h-8 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                <p className="text-white text-xs font-medium text-center line-clamp-2">{post.text.slice(0, 50)}</p>
                                            </div>
                                        ) : (
                                            // Text-only post
                                            <div className="w-full h-full flex items-center justify-center bg-[#262626] p-3">
                                                <p className="text-white text-xs font-medium text-center line-clamp-4">{post.text}</p>
                                            </div>
                                        )}

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                            <div className="flex items-center gap-1 text-white">
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                                </svg>
                                                <span className="font-semibold text-sm">{post.likesCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                                <span className="font-semibold text-sm">{post.commentsCount}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center mb-4">
                                    <CameraIcon className="w-8 h-8 text-gray-600" />
                                </div>
                                <h3 className="text-white font-bold text-lg">No Posts Yet</h3>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileView;
