
import React, { useState, useRef } from 'react';
import { PostTag, Post } from '../types/index';
import { t } from '../constants/locales';
import { PhotoIcon, XMarkIcon, SparklesIcon, ChartBarIcon } from '../components/Icons';
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

    // Poll State
    const [isPollMode, setIsPollMode] = useState(false);
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

    // Banner Option
    const [isBanner, setIsBanner] = useState(false);

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

            // Disable poll mode if images are added (WhatsApp style: Post is EITHER media OR poll usually, or difficult to UI mix)
            // But Instagram stories allow both. Let's allow mixed for fun, or restrict?
            // User requirement: "create a poll like whatsapp". WhatsApp allows text+poll.
            // Let's keep it simple. Mixed is okay.
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

    const [isPosting, setIsPosting] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim() && selectedFiles.length === 0 && !isPollMode) return;

        // Validate Poll
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

        setIsPosting(true);

        try {
            let uploadedUrls: string[] = [];
            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(file => userService.uploadPostImage(file));
                const results = await Promise.all(uploadPromises);
                uploadedUrls = results.filter(url => url !== null) as string[];
            }

            const postPayload: any = {
                text,
                images: uploadedUrls,
                tags: [],
                isBanner
            };

            if (isPollMode) {
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

    return (
        <div className="flex flex-col h-full bg-black animate-fade-in relative">
            {/* Header - Instagram Style */}
            <div className="flex items-center justify-between px-4 h-12 bg-black z-20">
                <button
                    onClick={onCancel}
                    className="text-white p-1 -ml-1"
                >
                    <XMarkIcon className="w-7 h-7 stroke-[1.5px]" />
                </button>

                {/* Empty Center */}
                <div className="flex-1"></div>

                <button
                    onClick={handleSubmit}
                    disabled={(!text.trim() && selectedFiles.length === 0 && !isPollMode) || isPosting}
                    className="text-[#0095F6] font-semibold text-[15px] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:text-[#E0F1FF]"
                >
                    {isPosting ? 'Posting...' : 'Post'}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow flex flex-col relative px-4 overflow-y-auto no-scrollbar">

                {/* User Info Row (Subtle) */}
                <div className="flex items-center gap-3 pt-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                        {/* Avatar Image or Initial - Placeholder logic needed if user prop not available directly here, but using placeholder style */}
                        <div className="text-[10px] font-bold text-gray-400">?</div>
                    </div>
                    <span className="text-gray-200 font-semibold text-[14px]">Anonymous Student</span>
                </div>

                {/* Main Text Input */}
                <div className="relative w-full min-h-[150px]">
                    <textarea
                        className="w-full h-full bg-transparent text-white text-[18px] placeholder:text-gray-500 resize-none focus:outline-none leading-relaxed"
                        placeholder={isPollMode ? "Ask a poll question..." : "What's on your mind?"}
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, maxChars))}
                        autoFocus
                        style={{ minHeight: '150px' }}
                    />
                </div>

                {/* Poll Creator (Minimal) */}
                {isPollMode && (
                    <div className="mt-4 flex flex-col gap-3 animate-fade-in">
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

                {/* Banner Option */}
                <div className="mt-4 flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isBanner"
                        checked={isBanner}
                        onChange={(e) => setIsBanner(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    <label htmlFor="isBanner" className="text-gray-400 text-sm select-none">
                        Promote to Banner (Ad/Event)
                    </label>
                </div>

                {/* Image Previews (Horizontal Scroll) */}
                {previews.length > 0 && !isPollMode && (
                    <div className="mt-6 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
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
                        {previews.length < 10 && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-shrink-0 w-32 aspect-[4/5] rounded-lg border border-dashed border-gray-700 flex items-center justify-center hover:bg-white/5 transition-colors"
                            >
                                <span className="text-2xl text-gray-600">+</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Toolbar (Keyboard Accessory Style) */}
            <div className={`p-3 border-t border-white/10 bg-black flex items-center gap-4 ${isPollMode ? 'pb-6' : ''}`}>
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageChange}
                />

                {/* Photo Button */}
                <button
                    onClick={() => {
                        setIsPollMode(false);
                        fileInputRef.current?.click();
                    }}
                    className={`p-2 rounded-full transition-all ${!isPollMode && previews.length > 0 ? 'bg-[#0095F6] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <PhotoIcon className="w-7 h-7 stroke-[1.5px]" />
                </button>

                {/* Poll Button */}
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
                    className={`p-2 rounded-full transition-all ${isPollMode ? 'bg-[#0095F6] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <ChartBarIcon className="w-7 h-7 stroke-[1.5px]" />
                </button>

                <div className="flex-1"></div>

                {/* Character Count (Only show if typed) */}
                {text.length > 0 && (
                    <span className={`text-xs font-medium ${charCount > maxChars * 0.9 ? 'text-red-500' : 'text-gray-500'}`}>
                        {charCount}/{maxChars}
                    </span>
                )}
            </div>
        </div>
    );
};

export default CreatePostView;
