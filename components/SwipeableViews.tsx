/**
 * ============================================================================
 * SWIPEABLE VIEWS COMPONENT
 * ============================================================================
 * 
 * Wraps multiple views and enables horizontal swipe navigation
 * Similar to how Instagram and other apps handle tab switching
 * 
 * ============================================================================
 */

import React, { useRef, useEffect, useState } from 'react';
import { View } from '../types';

interface SwipeableViewsProps {
    views: View[];
    currentView: View;
    onViewChange: (view: View) => void;
    children: React.ReactNode[];
    disabled?: boolean;
}

const SwipeableViews: React.FC<SwipeableViewsProps> = ({
    views,
    currentView,
    onViewChange,
    children,
    disabled = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [translateX, setTranslateX] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const isHorizontalRef = useRef<boolean | null>(null);

    const currentIndex = views.indexOf(currentView);
    const threshold = 50; // Minimum swipe distance
    const velocityThreshold = 0.3; // Minimum velocity

    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled) return;

        const touch = e.touches[0];
        setIsDragging(true);
        setStartX(touch.clientX);
        setStartY(touch.clientY);
        setStartTime(Date.now());
        isHorizontalRef.current = null;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || disabled) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        // Determine swipe direction on first significant movement
        if (isHorizontalRef.current === null) {
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
            }
        }

        // Only handle horizontal swipes
        if (isHorizontalRef.current) {
            // Add resistance at edges
            let boundedDelta = deltaX;
            if (currentIndex === 0 && deltaX > 0) {
                boundedDelta = deltaX * 0.3;
            } else if (currentIndex === views.length - 1 && deltaX < 0) {
                boundedDelta = deltaX * 0.3;
            }

            setTranslateX(boundedDelta);
        }
    };

    const handleTouchEnd = () => {
        if (!isDragging || disabled) {
            setIsDragging(false);
            setTranslateX(0);
            return;
        }

        if (!isHorizontalRef.current) {
            setIsDragging(false);
            setTranslateX(0);
            return;
        }

        const deltaTime = Date.now() - startTime;
        const velocity = Math.abs(translateX) / deltaTime;
        const shouldNavigate = Math.abs(translateX) > threshold || velocity > velocityThreshold;

        if (shouldNavigate) {
            if (translateX > 0 && currentIndex > 0) {
                // Swipe right - previous view
                onViewChange(views[currentIndex - 1]);
            } else if (translateX < 0 && currentIndex < views.length - 1) {
                // Swipe left - next view
                onViewChange(views[currentIndex + 1]);
            }
        }

        setIsDragging(false);
        setTranslateX(0);
        isHorizontalRef.current = null;
    };

    // Make sure we have children for each view
    const viewChildren = React.Children.toArray(children);
    const totalWidth = views.length * 100;

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div
                className="h-full flex"
                style={{
                    width: `${totalWidth}%`,
                    transform: `translateX(calc(-${currentIndex * (100 / views.length)}% + ${isDragging && isHorizontalRef.current ? translateX : 0}px))`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                }}
            >
                {views.map((view, index) => (
                    <div
                        key={view}
                        className="h-full flex-shrink-0"
                        style={{ width: `${100 / views.length}%` }}
                    >
                        {viewChildren[index]}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SwipeableViews;
