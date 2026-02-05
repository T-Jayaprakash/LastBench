import React, { useState, useEffect } from 'react';

interface PWAInstallPromptProps {
    onDismiss: () => void;
}

// Detect platform
const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isAndroid = () => {
    return /Android/.test(navigator.userAgent);
};

const isInStandaloneMode = () => {
    return (window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
};

const isMobileSafari = () => {
    const ua = navigator.userAgent;
    return isIOS() && ua.includes('Safari') && !ua.includes('CriOS') && !ua.includes('FxiOS');
};

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onDismiss }) => {
    const [show, setShow] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        // Don't show if already in standalone mode
        if (isInStandaloneMode()) {
            return;
        }

        // Check if dismissed recently (within 7 days)
        const lastDismissed = localStorage.getItem('pwa-install-dismissed');
        if (lastDismissed) {
            const dismissedDate = new Date(lastDismissed);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) {
                return;
            }
        }

        // Check if already installed
        const installed = localStorage.getItem('pwa-installed');
        if (installed) {
            return;
        }

        // Delayed show for better UX
        const timer = setTimeout(() => {
            if (isIOS() && isMobileSafari()) {
                setPlatform('ios');
                setShow(true);
            } else if (isAndroid()) {
                setPlatform('android');
                // Wait for beforeinstallprompt
                if ((window as any).deferredPrompt) {
                    setInstallPrompt((window as any).deferredPrompt);
                    setShow(true);
                }
            }
        }, 5000); // Show after 5 seconds for better engagement

        // Listen for install prompt on Android
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            if (isAndroid()) {
                setPlatform('android');
                setShow(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            localStorage.setItem('pwa-installed', 'true');
            setShow(false);
        });

        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('pwa-installed', 'true');
            }
            setInstallPrompt(null);
            setShow(false);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
        setShow(false);
        onDismiss();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className="w-full max-w-md bg-dark-surface border border-dark-border rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
                style={{
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 -10px 60px rgba(139, 92, 246, 0.2)'
                }}
            >
                {/* Header with gradient */}
                <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-accent-primary/20 to-transparent">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-primary to-purple-600 p-0.5 shadow-lg shadow-accent-primary/30">
                            <img
                                src="/assets/Genfess.png"
                                alt="Genfess"
                                className="w-full h-full rounded-2xl object-cover"
                            />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Install Genfess</h2>
                            <p className="text-sm text-white/60">Add to your home screen</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-6">
                    {platform === 'ios' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-dark-secondary-text">
                                Get the full app experience with notifications, faster loading, and offline access.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-500/20">
                                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-white">
                                            1. Tap the <span className="font-semibold">Share</span> button
                                        </p>
                                        <p className="text-xs text-white/50">at the bottom of Safari</p>
                                    </div>
                                    <div className="w-8 h-8 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-500/20">
                                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-white">
                                            2. Tap <span className="font-semibold">"Add to Home Screen"</span>
                                        </p>
                                        <p className="text-xs text-white/50">scroll down if needed</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-500/20">
                                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-white">
                                            3. Tap <span className="font-semibold">"Add"</span> to confirm
                                        </p>
                                        <p className="text-xs text-white/50">you're all set!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-dark-secondary-text">
                                Install Genfess for a faster, native app experience with push notifications.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleInstallClick}
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-accent-primary to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-accent-primary/30"
                                >
                                    Install Now
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="py-3 px-4 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Benefits */}
                    <div className="mt-6 pt-4 border-t border-white/10">
                        <p className="text-xs text-center text-white/40 mb-3">What you get</p>
                        <div className="flex justify-around">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-primary/20">
                                    <svg className="w-4 h-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <span className="text-xs text-white/60">Notifications</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20">
                                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-white/60">Faster</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/20">
                                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                                    </svg>
                                </div>
                                <span className="text-xs text-white/60">Offline</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-500/20">
                                    <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <span className="text-xs text-white/60">Native</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default PWAInstallPrompt;
