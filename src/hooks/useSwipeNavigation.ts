/**
 * ============================================================================
 * USE SWIPE NAVIGATION HOOK
 * ============================================================================
 * 
 * Enables swipe left/right navigation between screens
 * Similar to how Instagram handles tab switching
 * 
 * ============================================================================
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { View } from '../../types';

interface SwipeNavigationConfig {
    views: View[];
    currentView: View;
    onViewChange: (view: View) => void;
    threshold?: number; // Minimum swipe distance in pixels
    velocityThreshold?: number; // Minimum velocity for swipe
    edgeWidth?: number; // Width of edge zone for edge swipe detection
}

interface SwipeState {
    isDragging: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startTime: number;
}

export const useSwipeNavigation = ({
    views,
    currentView,
    onViewChange,
    threshold = 50,
    velocityThreshold = 0.3,
    edgeWidth = 30
}: SwipeNavigationConfig) => {
    const [swipeState, setSwipeState] = useState<SwipeState>({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        startTime: 0
    });

    const [translateX, setTranslateX] = useState(0);
    const isHorizontalSwipe = useRef<boolean | null>(null);

    const currentIndex = views.indexOf(currentView);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        const touch = e.touches[0];
        setSwipeState({
            isDragging: true,
            startX: touch.clientX,
            startY: touch.clientY,
            currentX: touch.clientX,
            currentY: touch.clientY,
            startTime: Date.now()
        });
        isHorizontalSwipe.current = null;
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!swipeState.isDragging) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - swipeState.startX;
        const deltaY = touch.clientY - swipeState.startY;

        // Determine if this is a horizontal or vertical swipe
        if (isHorizontalSwipe.current === null) {
            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
            }
        }

        // Only handle horizontal swipes
        if (isHorizontalSwipe.current) {
            e.preventDefault(); // Prevent vertical scrolling

            // Calculate bounded translateX
            let boundedDeltaX = deltaX;

            // Add resistance at edges
            if (currentIndex === 0 && deltaX > 0) {
                boundedDeltaX = deltaX * 0.3; // Resistance on left edge
            } else if (currentIndex === views.length - 1 && deltaX < 0) {
                boundedDeltaX = deltaX * 0.3; // Resistance on right edge
            }

            setTranslateX(boundedDeltaX);
            setSwipeState(prev => ({
                ...prev,
                currentX: touch.clientX,
                currentY: touch.clientY
            }));
        }
    }, [swipeState.isDragging, swipeState.startX, swipeState.startY, currentIndex, views.length]);

    const handleTouchEnd = useCallback(() => {
        if (!swipeState.isDragging || !isHorizontalSwipe.current) {
            setSwipeState(prev => ({ ...prev, isDragging: false }));
            setTranslateX(0);
            return;
        }

        const deltaX = swipeState.currentX - swipeState.startX;
        const deltaTime = Date.now() - swipeState.startTime;
        const velocity = Math.abs(deltaX) / deltaTime; // pixels per ms

        // Determine if we should navigate
        const shouldNavigate = Math.abs(deltaX) > threshold || velocity > velocityThreshold;

        if (shouldNavigate) {
            if (deltaX > 0 && currentIndex > 0) {
                // Swipe right - go to previous view
                onViewChange(views[currentIndex - 1]);
            } else if (deltaX < 0 && currentIndex < views.length - 1) {
                // Swipe left - go to next view
                onViewChange(views[currentIndex + 1]);
            }
        }

        // Reset state
        setSwipeState({
            isDragging: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0
        });
        setTranslateX(0);
        isHorizontalSwipe.current = null;
    }, [swipeState, currentIndex, views, onViewChange, threshold, velocityThreshold]);

    // Return swipe handlers and state
    return {
        swipeHandlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd
        },
        translateX: swipeState.isDragging && isHorizontalSwipe.current ? translateX : 0,
        isDragging: swipeState.isDragging && isHorizontalSwipe.current === true
    };
};

export default useSwipeNavigation;
