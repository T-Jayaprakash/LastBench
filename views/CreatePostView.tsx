
import React, { useState, useRef } from 'react';
import { PostTag, Post } from '../types/index';
import { t } from '../constants/locales';
import { PhotoIcon, XMarkIcon, SparklesIcon } from '../components/Icons';
import * as userService from '../services/userService';
import * as api from '../services/api';
import { useToast } from '../components/Toast';

interface CreatePostViewProps {
    onPostSuccess: (post: Post) => void;
    onCancel: () => void;
}

const CreatePostView: React.FC<CreatePostViewProps> = ({ onPostSuccess, onCancel }) => {
    const [text, setText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast, updateToast } = useToast();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files) as File[];
            const totalFiles = [...selectedFiles, ...newFiles].slice(0, 10);
            setSelectedFiles(totalFiles);

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            const totalPreviews = [...previews, ...newPreviews].slice(0, 10);
            setPreviews(totalPreviews);
        }
    };

    const handleRemoveImage = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    }

    const handleSubmit = async () => {
        if (!text.trim() && selectedFiles.length === 0) return;

        // 1. IMMEDIATE FEEDBACK: Close the view instantly
        onCancel();

        try {
            // 2. Create OPTIMISTIC post immediately (Instagram-like instant feedback)
            if (selectedFiles.length > 0) {
                // Get current user for optimistic post
                const currentUser = await userService.getCurrentUser();

                // Create optimistic post with local blob URLs for instant display
                const localUrls = selectedFiles.map(file => URL.createObjectURL(file));

                // Create a temporary optimistic post
                const optimisticPost: any = {
                    id: `temp_${Date.now()}`,
                    text,
                    images: localUrls,
                    imageUrl: localUrls[0],
                    authorAnonId: currentUser?.anonId || 'You',
                    displayName: currentUser?.displayName || 'You',
                    authorAvatarColor: currentUser?.avatarColor || '#000',
                    authorAvatarUrl: currentUser?.avatarUrl,
                    department: currentUser?.department || '',
                    tags: [],
                    likesCount: 0,
                    commentsCount: 0,
                    createdAt: new Date(),
                    trendingScore: 0,
                    isLiked: false
                };

                // Show optimistic post immediately
                onPostSuccess(optimisticPost);

                // 3. Upload images in background
                const uploadPromises = selectedFiles.map(async (file) => {
                    return await userService.uploadPostImage(file);
                });

                const uploadedUrls = await Promise.all(uploadPromises);
                const validUrls = uploadedUrls.filter(url => url !== null) as string[];

                if (validUrls.length === 0) {
                    throw new Error("Image upload failed.");
                }

                // 4. Create real post with uploaded URLs
                const newPost = await api.createPost({
                    text,
                    images: validUrls,
                    tags: [],
                });

                if (newPost) {
                    // Replace optimistic post with real post
                    onPostSuccess(newPost);
                } else {
                    throw new Error("Failed to save post.");
                }

                // Clean up blob URLs
                localUrls.forEach(url => URL.revokeObjectURL(url));

            } else {
                // Text-only post - no need for optimistic update
                const newPost = await api.createPost({
                    text,
                    tags: [],
                });

                if (newPost) {
                    onPostSuccess(newPost);
                } else {
                    throw new Error("Failed to save post.");
                }
            }

        } catch (e: any) {
            console.error("Post creation failed", e);
            updateToast("Post failed. Try again.", 'error');
        }
    };

    const charCount = text.length;
    const maxChars = 500;

    return (
        <div className="flex flex-col h-full bg-dark-background animate-fade-in relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <button
                    onClick={onCancel}
                    className="text-dark-secondary-text hover:text-dark-primary-text font-medium transition-colors"
                >
                    Cancel
                </button>

                <h2 className="text-lg font-semibold text-dark-primary-text">New Post</h2>

                <button
                    onClick={handleSubmit}
                    disabled={!text.trim() && selectedFiles.length === 0}
                    className="gradient-text font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Post
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow p-4 overflow-y-auto">
                {/* Text Input */}
                <div className="relative">
                    <textarea
                        className="w-full bg-transparent text-dark-primary-text text-lg placeholder:text-dark-secondary-text/50 resize-none focus:outline-none min-h-[200px] leading-relaxed"
                        placeholder={t.whatsOnYourMind}
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, maxChars))}
                        autoFocus
                    />

                    {/* Character count */}
                    <div className={`text-xs text-right ${charCount > maxChars * 0.9 ? 'text-accent-pink' : 'text-dark-secondary-text/50'}`}>
                        {charCount}/{maxChars}
                    </div>
                </div>

                {/* Image Previews Carousel */}
                {previews.length > 0 && (
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
                        {previews.map((src, index) => (
                            <div key={index} className="relative flex-shrink-0 w-48 aspect-[4/5] rounded-xl overflow-hidden snap-center border border-white/10 bg-dark-surface">
                                <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-2 right-2 bg-dark-background/80 text-white rounded-full p-1.5 hover:bg-accent-pink/80 transition-colors backdrop-blur-sm"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                                <div className="absolute bottom-2 right-2 bg-dark-background/80 px-2 py-0.5 rounded-lg text-xs text-white font-bold backdrop-blur-sm">
                                    {index + 1}/{previews.length}
                                </div>
                            </div>
                        ))}

                        {/* Add more button */}
                        {previews.length < 10 && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-shrink-0 w-48 aspect-[4/5] rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-accent-cyan/50 hover:bg-accent-cyan/5 transition-all snap-center"
                            >
                                <PhotoIcon className="w-8 h-8 text-dark-secondary-text" />
                                <span className="text-sm text-dark-secondary-text">Add More</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/5">
                {/* Add Photo Button */}
                {previews.length === 0 && (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 w-full p-4 rounded-xl bg-dark-surface border border-white/5 hover:border-accent-cyan/30 hover:bg-accent-cyan/5 transition-all mb-4"
                    >
                        <div className="w-10 h-10 rounded-full bg-accent-cyan/10 flex items-center justify-center">
                            <PhotoIcon className="w-5 h-5 text-accent-cyan" />
                        </div>
                        <div className="text-left">
                            <p className="text-dark-primary-text font-medium">{t.addPhoto}</p>
                            <p className="text-xs text-dark-secondary-text">Up to 10 images</p>
                        </div>
                    </button>
                )}

                <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageChange}
                />

                {/* Post Button - Full Width */}
                <button
                    onClick={handleSubmit}
                    disabled={!text.trim() && selectedFiles.length === 0}
                    className="w-full py-4 gradient-premium rounded-xl font-semibold text-white active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent-cyan/20 flex items-center justify-center gap-2"
                >
                    <SparklesIcon className="w-5 h-5" />
                    <span>Share Anonymously</span>
                </button>
            </div>
        </div>
    );
};

export default CreatePostView;
