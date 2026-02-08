
import React, { useState, useRef } from 'react';
import { PostTag, Post } from '../types/index';
import { t } from '../constants/locales';
import { PhotoIcon, XMarkIcon, SparklesIcon, ChartBarIcon, ClockIcon } from '../components/Icons';
import * as userService from '../services/userService';
import * as api from '../services/api';
import { useToast } from '../components/Toast';

interface CreatePostViewProps {
    onPostSuccess: (post: Post) => void;
    onCancel: () => void;
}

// Banner duration options
const BANNER_DURATIONS = [
    { label: '1 day', value: 1 },
    { label: '2 days', value: 2 },
    { label: '1 week', value: 7 },
    { label: '1 month', value: 30 },
];

const CreatePostView: React.FC<CreatePostViewProps> = ({ onPostSuccess, onCancel }) => {
    // Mode State
    const [activeMode, setActiveMode] = useState<'post' | 'banner'>('post');

    // Common State
    const [text, setText] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isPosting, setIsPosting] = useState(false);

    // Banner Specific State
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerDuration, setBannerDuration] = useState(1);

    // Poll State
    const [isPollMode, setIsPollMode] = useState(false);
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

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

    const handlePollOptionChange = (index: number, value: string) => {
        const newOptions = [...pollOptions];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const addPollOption = () => {
        if (pollOptions.length < 10) {
            setPollOptions([...pollOptions, '']);
        }
    };

    const removePollOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (activeMode === 'post') {
            if (!text.trim() && selectedFiles.length === 0 && !isPollMode) return;
            if (isPollMode) {
                const validOptions = pollOptions.filter(o => o.trim().length > 0);
                if (validOptions.length < 2) {
                    updateToast("Poll needs at least 2 options.", 'error');
                    return;
                }
                if (!text.trim()) {
                    updateToast("Please ask a question for your poll.", 'error');
                    return;
                }
            }
        } else {
            // Banner Mode Validation
            if (!bannerTitle.trim()) {
                updateToast("Banner needs a title.", 'error');
                return;
            }
            if (selectedFiles.length === 0) {
                updateToast("Banner needs an image.", 'error');
                return;
            }
        }

        setIsPosting(true);

        try {
            let uploadedUrls: string[] = [];
            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(file => userService.uploadPostImage(file));
                const results = await Promise.all(uploadPromises);
                uploadedUrls = results.filter(url => url !== null) as string[];
            }

            // Calculate banner expiry date
            let bannerExpiresAt: Date | undefined;
            if (activeMode === 'banner') {
                bannerExpiresAt = new Date();
                bannerExpiresAt.setDate(bannerExpiresAt.getDate() + bannerDuration);
            }

            const postPayload: any = {
                text: text, // For banner, text is subtitle/description
                images: uploadedUrls,
                tags: [],
                isBanner: activeMode === 'banner',
                bannerExpiresAt: activeMode === 'banner' ? bannerExpiresAt : undefined,
                title: activeMode === 'banner' ? bannerTitle : undefined,
                hiddenFromFeed: activeMode === 'banner' // Exclusive banner
            };

            if (isPollMode && activeMode === 'post') {
                const validOptions = pollOptions.filter(o => o.trim().length > 0);
                postPayload.poll = {
                    question: text,
                    options: validOptions.map(opt => ({
                        id: Math.random().toString(36).substr(2, 9),
                        text: opt,
                        voteCount: 0
                    })),
                    totalVotes: 0,
                    allowMultipleAnswers: false
                };
            }

            const newPost = await api.createPost(postPayload);

            if (newPost) {
                onPostSuccess(newPost);
            } else {
                throw new Error("Failed to save post.");
            }

        } catch (e: any) {
            console.error("Post creation failed", e);
            updateToast("Post failed. Try again.", 'error');
            setIsPosting(false);
        }
    };

    const charCount = text.length;
    const maxChars = 500;
    const titleMaxChars = 50;

    const getDurationLabel = () => {
        const duration = BANNER_DURATIONS.find(d => d.value === bannerDuration);
        return duration?.label || '1 day';
    };

    return (
        <div className="flex flex-col h-full bg-black animate-fade-in relative">
            {/* Header - Mode Switcher */}
            <div className="flex flex-col bg-black z-20 border-b border-white/5 pb-2">
                <div className="flex items-center justify-between px-4 h-12">
                    {/* Cancel button removed */}
                    <div className="flex-1"></div>
                    <button
                        onClick={handleSubmit}
                        disabled={isPosting}
                        className="text-[#0095F6] font-semibold text-[15px] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:text-[#E0F1FF]"
                    >
                        {isPosting ? 'Posting...' : (activeMode === 'banner' ? 'Create Banner' : 'Post')}
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="flex px-4 gap-4">
                    <button
                        onClick={() => { setActiveMode('post'); setIsPollMode(false); }}
                        className={`pb-2 text-sm font-semibold transition-colors relative ${activeMode === 'post' ? 'text-white' : 'text-gray-500'}`}
                    >
                        Regular Post
                        {activeMode === 'post' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
                    </button>
                    <button
                        onClick={() => { setActiveMode('banner'); setIsPollMode(false); }}
                        className={`pb-2 text-sm font-semibold transition-colors relative ${activeMode === 'banner' ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600' : 'text-gray-500'}`}
                    >
                        Create Banner 👑
                        {activeMode === 'banner' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-400 to-red-600 rounded-full" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow flex flex-col relative px-4 overflow-y-auto no-scrollbar pt-4 pb-10">

                {/* Banner Mode Fields */}
                {activeMode === 'banner' && (
                    <div className="mb-4 animate-fade-in space-y-4">
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-red-500/20">
                            <label className="block text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Banner Headline</label>
                            <input
                                type="text"
                                value={bannerTitle}
                                onChange={(e) => setBannerTitle(e.target.value.slice(0, titleMaxChars))}
                                placeholder="Catchy Headline (e.g. 'Campus Fest 2026')"
                                className="w-full bg-transparent text-white text-xl font-bold placeholder:text-gray-600 focus:outline-none"
                            />
                            <div className="text-right text-[10px] text-gray-500 mt-1">{bannerTitle.length}/{titleMaxChars}</div>
                        </div>
                    </div>
                )}

                {/* Main Text Input */}
                <div className="relative w-full min-h-[100px]">
                    <textarea
                        className="w-full h-full bg-transparent text-white text-[16px] placeholder:text-gray-500 resize-none focus:outline-none leading-relaxed"
                        placeholder={activeMode === 'banner' ? "Add a short description or subtitle..." : (isPollMode ? "Ask a poll question..." : "What's on your mind?")}
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, maxChars))}
                        autoFocus={activeMode === 'post'}
                        style={{ minHeight: '100px' }}
                    />
                </div>

                {/* Media & Poll Toolbar - Immediately below text */}
                <div className="mt-2 flex items-center gap-4 py-2 border-b border-white/5 pb-4 mb-4">
                    <input
                        type="file"
                        multiple={activeMode === 'post'}
                        accept="image/*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleImageChange}
                    />

                    <button
                        onClick={() => {
                            setIsPollMode(false);
                            fileInputRef.current?.click();
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${(!isPollMode && previews.length > 0) || activeMode === 'banner' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <PhotoIcon className="w-5 h-5 stroke-[1.5px]" />
                        <span className="text-sm font-medium">Photo</span>
                    </button>

                    {/* Poll Button - Hidden in Banner Mode */}
                    {activeMode === 'post' && (
                        <button
                            onClick={() => {
                                if (previews.length > 0) {
                                    if (confirm('Switching to Poll mode will remove selected images. Continue?')) {
                                        setPreviews([]);
                                        setSelectedFiles([]);
                                        setIsPollMode(true);
                                    }
                                } else {
                                    setIsPollMode(!isPollMode);
                                }
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${isPollMode ? 'border-[#0095F6]/50 bg-[#0095F6]/10 text-[#0095F6]' : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <ChartBarIcon className="w-5 h-5 stroke-[1.5px]" />
                            <span className="text-sm font-medium">Poll</span>
                        </button>
                    )}

                    <div className="flex-1"></div>

                    {/* Character Count */}
                    {text.length > 0 && (
                        <span className={`text-xs font-medium ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
                            {charCount}/{maxChars}
                        </span>
                    )}
                </div>

                {/* Poll Creator (Only in Post Mode) */}
                {isPollMode && activeMode === 'post' && (
                    <div className="flex flex-col gap-3 animate-fade-in pt-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Poll Options</label>
                        {pollOptions.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handlePollOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="w-full bg-[#121212] text-white p-3 rounded-xl border border-white/10 focus:border-white/20 focus:outline-none text-[15px]"
                                />
                                {pollOptions.length > 2 && (
                                    <button onClick={() => removePollOption(index)} className="p-2 text-gray-500">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {pollOptions.length < 10 && (
                            <button onClick={addPollOption} className="text-[#0095F6] text-sm font-semibold self-start hover:opacity-80 p-1">
                                + Add Option
                            </button>
                        )}
                    </div>
                )}

                {/* Banner Duration */}
                {activeMode === 'banner' && (
                    <div className="mt-1 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400 text-sm">Banner Duration</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {BANNER_DURATIONS.map((duration) => (
                                <button
                                    key={duration.value}
                                    onClick={() => setBannerDuration(duration.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${bannerDuration === duration.value
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                        : 'bg-[#262626] text-gray-300 hover:bg-[#363636]'
                                        }`}
                                >
                                    {duration.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-gray-500 text-xs mt-3 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                            ℹ️ This banner will be displayed exclusively in the top carousel section for {getDurationLabel()}. It will NOT appear in the regular feed.
                        </p>
                    </div>
                )}

                {/* Image Previews */}
                {previews.length > 0 && !isPollMode && (
                    <div className="mt-4 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                        {previews.map((src, index) => (
                            <div key={index} className="relative flex-shrink-0 w-32 aspect-[4/5] rounded-lg overflow-hidden border border-white/10 bg-gray-900 group">
                                <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/90"
                                >
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatePostView;
