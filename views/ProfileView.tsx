
import React, { useState, useEffect, useRef } from 'react';
import { Post, User, Theme } from '../types/index';
import * as api from '../services/api';
import { uploadAvatar } from '../services/userService';
import { t } from '../constants/locales';
import { PencilIcon, CameraIcon, TrashIcon, CogIcon, ArrowRightOnRectangleIcon, GridIcon } from '../components/Icons';
import { DEPARTMENTS, AVATAR_COLORS } from '../constants/config';

interface ProfileViewProps {
    user: User | null;
    onUpdateUser: (user: User) => void;
    theme: Theme;
    toggleTheme: () => void;
    onLogout: () => void;
    onViewImages: (images: string[], index: number) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, theme, toggleTheme, onLogout, onViewImages }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [editedName, setEditedName] = useState(user?.displayName || '');
    const [editedDept, setEditedDept] = useState(user?.department || '');
    const [editedColor, setEditedColor] = useState(user?.avatarColor || AVATAR_COLORS[0]);
    const [editedAvatarUrl, setEditedAvatarUrl] = useState<string | undefined>(user?.avatarUrl);
    const [imgError, setImgError] = useState(false);

    const [customDept, setCustomDept] = useState('');
    const [isOtherDept, setIsOtherDept] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

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
        const fetchPosts = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const fetchedPosts = await api.getUserPosts(user.userId);
                setPosts(fetchedPosts);
            } catch (error) {
                console.error("Failed to fetch profile posts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, [user]);

    if (!user) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

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

    const handleDeletePost = async (e: React.MouseEvent, postId: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this post?")) {
            const success = await api.deletePost(postId);
            if (success) {
                setPosts(prev => prev.filter(p => p.id !== postId));
            } else {
                alert("Failed to delete post.");
            }
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }

        setIsUploading(true);
        try {
            const url = await uploadAvatar(file);
            if (url) {
                setEditedAvatarUrl(url);
            } else {
                throw new Error("Upload returned no URL");
            }
        } catch (error) {
            console.error('Avatar upload failed:', error);
            alert('Failed to upload image. Please try a smaller image or check your connection.');
        } finally {
            setIsUploading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const currentAvatarUrl = isEditing ? editedAvatarUrl : user.avatarUrl;
    const currentAvatarColor = isEditing ? editedColor : user.avatarColor;
    const currentDisplayName = isEditing ? editedName : user.displayName;

    return (
        <div className="min-h-full bg-dark-background animate-fade-in">
            {/* Profile Header Section */}
            <div className="relative px-4 pt-4 pb-6">
                {/* Top Actions */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-xl text-dark-secondary-text hover:text-dark-primary-text hover:bg-white/5 transition-all"
                        aria-label="Logout"
                    >
                        <ArrowRightOnRectangleIcon className="w-6 h-6" />
                    </button>

                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 rounded-xl text-accent-cyan hover:bg-accent-cyan/10 transition-all"
                            aria-label="Edit Profile"
                        >
                            <PencilIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                        {/* Gradient Ring */}
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-pink opacity-80 blur-sm" />

                        {/* Avatar */}
                        <div
                            className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white overflow-hidden border-2 border-dark-background ${isEditing ? 'cursor-pointer' : ''}`}
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

                            {/* Upload Overlay */}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    {isUploading ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CameraIcon className="w-8 h-8 text-white" />
                                    )}
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

                    {/* User Details or Edit Form */}
                    {isEditing ? (
                        <div className="w-full max-w-sm mt-4 space-y-5 animate-fade-in px-4">
                            {/* Username */}
                            <div>
                                <label className="block text-xs text-dark-secondary-text font-semibold uppercase tracking-wider mb-2">Username</label>
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="input-premium"
                                    placeholder="#Student123"
                                />
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-xs text-dark-secondary-text font-semibold uppercase tracking-wider mb-2">Department</label>
                                <select
                                    value={isOtherDept ? 'Other' : editedDept}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setEditedDept(val);
                                        setIsOtherDept(val === 'Other');
                                        if (val !== 'Other') setCustomDept('');
                                    }}
                                    className="input-premium"
                                >
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    <option value="Other">Other...</option>
                                </select>
                                {isOtherDept && (
                                    <input
                                        type="text"
                                        value={customDept}
                                        onChange={(e) => setCustomDept(e.target.value)}
                                        placeholder="Enter department"
                                        className="input-premium mt-2"
                                    />
                                )}
                            </div>

                            {/* Avatar Color */}
                            <div>
                                <label className="block text-xs text-dark-secondary-text font-semibold uppercase tracking-wider mb-3">Avatar Color</label>
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {AVATAR_COLORS.map(color => (
                                        <button
                                            key={color}
                                            className={`w-10 h-10 rounded-full flex-shrink-0 transition-all duration-200 ${editedColor === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-dark-background ring-white' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => {
                                                setEditedColor(color);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-semibold text-dark-primary-text hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!editedName.trim() || (isOtherDept && !customDept.trim())}
                                    className="flex-1 py-3 gradient-premium rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-glow transition-all"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center mt-2 animate-fade-in">
                            {/* Username Badge */}
                            <div className="username-badge text-lg mb-2">
                                {user.displayName}
                            </div>

                            <p className="text-dark-secondary-text text-sm">
                                {user.department} • {user.college}
                            </p>

                            {/* Stats */}
                            <div className="flex justify-center gap-8 mt-5">
                                <div className="text-center">
                                    <span className="block text-2xl font-bold text-dark-primary-text">{posts.length}</span>
                                    <span className="text-xs text-dark-secondary-text uppercase tracking-wider">Posts</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Posts Section - Only show when not editing */}
            {!isEditing && (
                <>
                    {/* Section Header */}
                    <div className="flex items-center justify-center py-3 border-t border-b border-white/5">
                        <GridIcon className="w-5 h-5 text-dark-primary-text" />
                        <span className="ml-2 text-sm font-semibold text-dark-primary-text uppercase tracking-wider">Posts</span>
                    </div>

                    {/* Posts Grid */}
                    <div className="pb-safe">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : posts.length > 0 ? (
                            <div className="grid grid-cols-3 gap-0.5">
                                {posts.map((post) => (
                                    <div
                                        key={post.id}
                                        className="aspect-square bg-dark-surface relative overflow-hidden group cursor-pointer"
                                        onClick={() => {
                                            const images = (post.images && post.images.length > 0) ? post.images : (post.imageUrl ? [post.imageUrl] : []);
                                            if (images.length > 0) onViewImages(images, 0);
                                        }}
                                    >
                                        {post.imageUrl ? (
                                            <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-premium-soft">
                                                <p className="text-[11px] line-clamp-4 text-dark-primary-text font-medium leading-tight text-center">{post.text}</p>
                                            </div>
                                        )}

                                        {/* Multiple images indicator */}
                                        {post.images && post.images.length > 1 && (
                                            <div className="absolute top-2 right-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white drop-shadow-lg">
                                                    <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                                            <span className="flex items-center gap-1 font-bold text-sm">
                                                ❤ {post.likesCount}
                                            </span>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => handleDeletePost(e, post.id)}
                                            className="absolute top-2 left-2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 px-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                    <GridIcon className="w-8 h-8 text-dark-secondary-text" />
                                </div>
                                <p className="text-dark-secondary-text font-medium">No posts yet</p>
                                <p className="text-sm text-dark-secondary-text/60 mt-1">Share your first confession!</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ProfileView;
