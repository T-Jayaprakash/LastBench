import React, { useState } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    lowResSrc?: string;
}

/**
 * LazyImage Component
 * Implements "Blur-Up" or "Pulse-to-Sharp" transition.
 * Uses native loading="lazy" for off-screen deferral.
 */
const LazyImage: React.FC<LazyImageProps> = ({ src, lowResSrc, className, alt, ...props }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className={`relative overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}>
            {lowResSrc && !isLoaded && (
                <img
                    src={lowResSrc}
                    alt={alt}
                    className="absolute inset-0 w-full h-full object-cover blur-sm scale-110"
                />
            )}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                {...props}
            />
            {!isLoaded && !lowResSrc && (
                <div className="absolute inset-0 animate-pulse bg-gray-300 dark:bg-gray-700" />
            )}
        </div>
    );
};

export default LazyImage;
