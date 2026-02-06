import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../types';
import * as api from '../services/api';
import LazyImage from './LazyImage';

interface AdvertisingBannerProps {
    onPostClick: (post: Post) => void;
}

// Default GenFess advertisement banners
const DEFAULT_BANNERS = [
    {
        id: 'genfess-ad-1',
        imageUrl: '/banners/banner_1.png',
        title: 'Share Your Stories Anonymously',
        subtitle: 'Your voice matters. Express yourself freely.'
    },
    {
        id: 'genfess-ad-2',
        imageUrl: '/banners/banner_2.png',
        title: 'Your Campus, Your Voice',
        subtitle: 'Connect with your college community.'
    },
    {
        id: 'genfess-ad-3',
        imageUrl: '/banners/banner_3.png',
        title: 'Create Polls. Get Answers.',
        subtitle: 'Know what your peers think.'
    },
    {
        id: 'genfess-ad-4',
        imageUrl: '/banners/banner_4.png',
        title: 'Connect. Confess. Celebrate.',
        subtitle: 'Join the GenFess community today.'
    }
];

const AdvertisingBanner: React.FC<AdvertisingBannerProps> = ({ onPostClick }) => {
    const [bannerPosts, setBannerPosts] = useState<Post[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [translateX, setTranslateX] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Combine default banners with user-posted banners
    const allBanners = [
        ...DEFAULT_BANNERS.map(b => ({
            ...b,
            isDefault: true
        })),
        ...bannerPosts.map(p => ({
            id: p.id,
            imageUrl: p.imageUrl || (p.images && p.images[0]) || '',
            title: p.title || p.text.slice(0, 50) + (p.text.length > 50 ? '...' : ''),
            subtitle: p.title ? p.text : p.displayName,
            isDefault: false,
            post: p
        }))
    ];

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const posts = await api.getBannerPosts();
                setBannerPosts(posts);
            } catch (error) {
                console.error('Failed to fetch banner posts:', error);
            }
        };
        fetchBanners();
    }, []);

    // Auto-scroll carousel
    useEffect(() => {
        if (allBanners.length <= 1 || isDragging) return;

        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % allBanners.length);
        }, 5000); // 5s duration

        return () => clearInterval(interval);
    }, [allBanners.length, isDragging]);

    // Touch/Swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setStartX(e.touches[0].clientX);
        setTranslateX(0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        setTranslateX(diff);
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const threshold = 50; // minimum swipe distance
        if (translateX > threshold && currentSlide > 0) {
            // Swipe right - previous
            setCurrentSlide(prev => prev - 1);
        } else if (translateX < -threshold && currentSlide < allBanners.length - 1) {
            // Swipe left - next
            setCurrentSlide(prev => prev + 1);
        }

        setTranslateX(0);
    };

    const handleBannerClick = (banner: typeof allBanners[0]) => {
        if (banner.isDefault) {
            // For default banners, we could navigate to a specific action
            // For now, just ignore or show a toast
            return;
        }
        if ('post' in banner && banner.post) {
            onPostClick(banner.post);
        }
    };

    const goToSlide = (index: number) => {
        setCurrentSlide(index);
    };

    if (allBanners.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className="w-full relative bg-gray-900 border-b border-white/10 aspect-[16/9] overflow-hidden group"
            onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e); }}
            onTouchMove={(e) => { e.stopPropagation(); handleTouchMove(e); }}
            onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(); }}
        >
            {/* Slides Container */}
            <div
                className="w-full h-full flex transition-transform duration-500 ease-out"
                style={{
                    transform: `translateX(calc(-${currentSlide * 100}% + ${isDragging ? translateX : 0}px))`,
                    transition: isDragging ? 'none' : 'transform 0.5s ease-out'
                }}
            >
                {allBanners.map((banner, index) => (
                    <div
                        key={banner.id}
                        className="min-w-full h-full relative cursor-pointer flex-shrink-0"
                        onClick={() => handleBannerClick(banner)}
                    >
                        {/* Background Image */}
                        {banner.imageUrl ? (
                            <LazyImage
                                src={banner.imageUrl}
                                alt={banner.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900" />
                        )}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Content Overlay */}
                        <div className="absolute inset-0 flex flex-col justify-end p-4">
                            <span className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${banner.isDefault ? 'text-cyan-400' : 'text-yellow-500'}`}>
                                {banner.isDefault ? '✨ Discover' : '📢 Sponsored'}
                            </span>
                            <h3 className="text-white font-bold text-lg line-clamp-1 drop-shadow-lg">
                                {banner.title}
                            </h3>
                            <p className="text-gray-300 text-xs line-clamp-1 mt-0.5 drop-shadow-md">
                                {banner.subtitle}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Dots */}
            {allBanners.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {allBanners.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                goToSlide(i);
                            }}
                            className={`rounded-full transition-all duration-300 ${i === currentSlide
                                ? 'w-4 h-1.5 bg-white'
                                : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
                                }`}
                            aria-label={`Go to slide ${i + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Left/Right Arrow Indicators (visible on hover) */}
            {allBanners.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlide(prev => (prev === 0 ? allBanners.length - 1 : prev - 1));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        aria-label="Previous slide"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentSlide(prev => (prev === allBanners.length - 1 ? 0 : prev + 1));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        aria-label="Next slide"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {/* Slide Counter */}
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">
                {currentSlide + 1}/{allBanners.length}
            </div>
        </div>
    );
};

export default AdvertisingBanner;
