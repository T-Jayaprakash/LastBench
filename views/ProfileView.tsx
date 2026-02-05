
import React, { useState, useEffect, useRef } from 'react';
import { Post, User, Theme } from '../types/index';
import * as api from '../services/api';
import { uploadAvatar } from '../services/userService';
import { t } from '../constants/locales';
import { PencilIcon, CameraIcon, TrashIcon, CogIcon, ArrowRightOnRectangleIcon, ArrowLeftIcon, GridIcon } from '../components/Icons';
import { DEPARTMENTS, AVATAR_COLORS } from '../constants/config';
import PostCard from '../components/PostCard';

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
            <div className="flex items-center justify-center h-full bg-black">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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

    // Placeholder handlers for PostCard since ProfileView is isolated here
    const handleCommentClick = (post: Post) => { console.log('Comment clicked', post.id); };
    const handleOptionsClick = (post: Post) => { console.log('Options clicked', post.id); };

    const currentAvatarUrl = isEditing ? editedAvatarUrl : user.avatarUrl;
    const currentAvatarColor = isEditing ? editedColor : user.avatarColor;
    const currentDisplayName = isEditing ? editedName : user.displayName;

    return (
        <div className="min-h-full bg-black relative animate-fade-in">
            {/* Header - Silent & Native */}
            <div className="flex items-center justify-between px-4 h-12 sticky top-0 bg-black z-30 border-b border-white/5">
                <button className="p-1 -ml-1 text-white hover:opacity-70">
                    <ArrowLeftIcon className="w-6 h-6 stroke-[2px]" />
                </button>
                <div className="flex-1"></div>
                <button
                    onClick={onLogout}
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

                    {/* Stats Row */}
                    {!isEditing && (
                        <div className="flex items-center gap-8 mt-5 mb-5">
                            <div className="flex flex-col items-center">
                                <span className="text-white font-bold text-[18px]">{posts.length}</span>
                                <span className="text-gray-500 text-[13px] font-normal">posts</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-white font-bold text-[18px]">0</span>
                                <span className="text-gray-500 text-[13px] font-normal">followers</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-white font-bold text-[18px]">0</span>
                                <span className="text-gray-500 text-[13px] font-normal">following</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="w-full mt-2 flex gap-2">
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
                            <button className="bg-[#262626] text-white p-1.5 rounded-lg active:scale-95 transition-transform">
                                <span className="text-xs px-1">Share profile</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Section - List Feed Style */}
                {!isEditing && (
                    <div className="w-full">
                        {loading ? (
                            <div className="flex justify-center p-12">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : posts.length > 0 ? (
                            <div className="flex flex-col">
                                {posts.map((post, index) => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        index={index}
                                        currentUser={user}
                                        onCommentClick={handleCommentClick}
                                        onOptionsClick={handleOptionsClick}
                                        onImageClick={onViewImages}
                                    />
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
