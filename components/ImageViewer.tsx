
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface ImageViewerProps {
    images: string[];
    initialIndex: number;
    onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [lastTap, setLastTap] = useState(0);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const imageRef = useRef<HTMLImageElement>(null);
    const initialDistance = useRef<number>(0);

    // Prevent background scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Reset zoom when changing images
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [currentIndex]);

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex < images.length - 1 && scale === 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0 && scale === 1) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    // Swipe Logic (only when not zoomed)
    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch to zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            initialDistance.current = distance;
        } else if (e.touches.length === 1) {
            if (scale > 1) {
                // Start panning
                setIsPanning(true);
                setPanStart({
                    x: e.touches[0].clientX - position.x,
                    y: e.touches[0].clientY - position.y
                });
            } else {
                // Swipe to change image
                setTouchEnd(null);
                setTouchStart(e.targetTouches[0].clientX);
            }
        }
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // Pinch to zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            if (initialDistance.current > 0) {
                const newScale = Math.min(Math.max((distance / initialDistance.current) * scale, 1), 4);
                setScale(newScale);
            }
        } else if (e.touches.length === 1) {
            if (isPanning && scale > 1) {
                // Pan the image
                const newX = e.touches[0].clientX - panStart.x;
                const newY = e.touches[0].clientY - panStart.y;
                setPosition({ x: newX, y: newY });
            } else if (scale === 1) {
                setTouchEnd(e.targetTouches[0].clientX);
            }
        }
    };

    const onTouchEnd = () => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (!touchStart || !touchEnd || scale > 1) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe) handleNext();
        if (isRightSwipe) handlePrev();
    };

    // Double tap to zoom
    const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;

        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            if (scale === 1) {
                setScale(2.5);
            } else {
                setScale(1);
                setPosition({ x: 0, y: 0 });
            }
        }
        setLastTap(currentTime);
    };

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center animate-fade-in touch-none"
            onClick={scale === 1 ? onClose : undefined}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white backdrop-blur-md hover:bg-black/70 transition-all active:scale-95"
            >
                <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Counter */}
            {images.length > 1 && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-xs font-bold rounded-full backdrop-blur-md z-50">
                    {currentIndex + 1} / {images.length}
                </div>
            )}

            {/* Zoom Indicator */}
            {scale > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-xs font-bold rounded-full backdrop-blur-md z-50 animate-fade-in">
                    {Math.round(scale * 100)}%
                </div>
            )}

            {/* Navigation Arrows (Desktop) - Only when not zoomed */}
            {scale === 1 && currentIndex > 0 && (
                <button
                    onClick={handlePrev}
                    className="hidden md:block absolute left-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all z-50 active:scale-95"
                >
                    <ChevronLeftIcon className="w-8 h-8" />
                </button>
            )}
            {scale === 1 && currentIndex < images.length - 1 && (
                <button
                    onClick={handleNext}
                    className="hidden md:block absolute right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all z-50 active:scale-95"
                >
                    <ChevronRightIcon className="w-8 h-8" />
                </button>
            )}

            {/* Image Container */}
            <div
                className="w-full h-full flex items-center justify-center overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <img
                    ref={imageRef}
                    src={images[currentIndex]}
                    alt={`View ${currentIndex}`}
                    className="max-w-full max-h-full object-contain transition-transform duration-300 ease-out select-none"
                    style={{
                        transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                        cursor: scale > 1 ? 'grab' : 'zoom-in',
                        touchAction: 'none'
                    }}
                    onClick={handleTap}
                    draggable={false}
                />
            </div>

            {/* Instructions */}
            {scale === 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white text-xs rounded-full backdrop-blur-md z-50 animate-fade-in">
                    Double tap to zoom • Pinch to zoom • Swipe to change
                </div>
            )}
        </div>
    );
};

export default ImageViewer;
