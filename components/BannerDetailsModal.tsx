
import React from 'react';
import { Post } from '../types';
import { XMarkIcon } from './Icons';

interface BannerDetailsModalProps {
    post: Post;
    onClose: () => void;
    onViewImage?: (image: string) => void;
}

const BannerDetailsModal: React.FC<BannerDetailsModalProps> = ({ post, onClose, onViewImage }) => {
    // Extract potential links from text
    const extractLinks = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    };

    const links = extractLinks(post.text);
    const imageUrl = post.imageUrl || (post.images && post.images[0]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between px-4 h-14 bg-black border-b border-white/10 shrink-0">
                <span className="text-yellow-500 font-bold text-xs uppercase tracking-wider">Sponsored</span>
                <button
                    onClick={onClose}
                    className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <XMarkIcon className="w-6 h-6 stroke-[2px]" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-4 space-y-6">

                {/* Banner Image (Full View) */}
                {imageUrl && (
                    <div
                        className="w-full rounded-xl overflow-hidden bg-[#121212] border border-white/10 cursor-pointer active:opacity-90 transition-opacity relative"
                        onClick={() => onViewImage && onViewImage(imageUrl)}
                    >
                        <img
                            src={imageUrl}
                            alt="Banner"
                            className="w-full h-auto object-contain max-h-[60vh]"
                        />
                        <div className="absolute top-2 right-2 bg-black/60 p-2 rounded-full backdrop-blur-md pointer-events-none border border-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* Banner Info */}
                <div className="space-y-4">
                    {post.title && (
                        <h1 className="text-2xl font-bold text-white leading-tight">
                            {post.title}
                        </h1>
                    )}

                    <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {post.text}
                    </div>

                    {/* Extracted Links */}
                    {links.length > 0 && (
                        <div className="pt-4 border-t border-white/10 mt-4">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Links</h3>
                            <div className="flex flex-col gap-3">
                                {links.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 bg-[#1a1a1a] p-3 rounded-lg border border-white/10 active:bg-[#262626]"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-blue-400 text-sm font-medium truncate">{link}</div>
                                            <div className="text-gray-500 text-xs">Tap to open</div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="pt-8 text-center">
                    <p className="text-[10px] text-gray-600">
                        Posted by {post.displayName || post.authorAnonId} • Banner Ad
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BannerDetailsModal;
