import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import * as api from '../services/api';
import LazyImage from './LazyImage';

interface AdvertisingBannerProps {
    onPostClick: (post: Post) => void;
}

const AdvertisingBanner: React.FC<AdvertisingBannerProps> = ({ onPostClick }) => {
    const [bannerPosts, setBannerPosts] = useState<Post[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const fetchBanners = async () => {
            const posts = await api.getBannerPosts();
            setBannerPosts(posts);
        };
        fetchBanners();
    }, []);

    // Auto-scroll carousel
    useEffect(() => {
        if (bannerPosts.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % bannerPosts.length);
        }, 5000); // 5s duration

        return () => clearInterval(interval);
    }, [bannerPosts.length]);

    if (bannerPosts.length === 0) return null;

    return (
        <div className="w-full relative bg-gray-900 border-b border-white/10 aspect-[2.5/1] overflow-hidden group">
            <div
                className="w-full h-full flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
                {bannerPosts.map((post) => (
                    <div
                        key={post.id}
                        className="min-w-full h-full relative cursor-pointer"
                        onClick={() => onPostClick(post)}
                    >
                        {/* Background Image / Gradient */}
                        {post.imageUrl ? (
                            <LazyImage
                                src={post.imageUrl}
                                alt="Ad"
                                className="w-full h-full object-cover opacity-60"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-r from-purple-900 to-indigo-900 opacity-80" />
                        )}

                        {/* Content Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black via-black/40 to-transparent">
                            <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider mb-1">Sponsored</span>
                            <h3 className="text-white font-bold text-lg line-clamp-1">{post.text}</h3>
                            <p className="text-gray-300 text-xs line-clamp-2 mt-0.5">{post.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Dots */}
            {bannerPosts.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {bannerPosts.map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentSlide ? 'bg-white w-3' : 'bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdvertisingBanner;
