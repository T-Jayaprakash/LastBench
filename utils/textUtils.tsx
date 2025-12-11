import React from 'react';

/**
 * Converts text containing URLs into clickable links.
 * Returns an array of React Elements.
 */
export const linkifyText = (text: string): (string | React.ReactNode)[] => {
    if (!text) return [];

    // Regex for URL detection (http/https/www) - simplified but effective for most cases
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
                <a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
                    onClick={(e) => e.stopPropagation()} // Prevent parent click handlers (like post expand)
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};
