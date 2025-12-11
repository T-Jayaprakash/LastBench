import React from 'react';

interface UpdateModalProps {
    version: string;
    message?: string;
    updateUrl: string;
    forceUpdate: boolean;
    onClose?: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ version, message, updateUrl, forceUpdate, onClose }) => {
    const handleUpdate = () => {
        window.location.href = updateUrl;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-card-bg dark:bg-dark-card-bg rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-up border border-border-color dark:border-dark-border-color">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-accent-primary to-pink-500 p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        {forceUpdate ? 'Update Required' : 'Update Available'}
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    <p className="text-lg font-semibold text-primary-text dark:text-dark-primary-text mb-2">
                        Version {version}
                    </p>
                    <p className="text-secondary-text dark:text-dark-secondary-text mb-4">
                        {message || (forceUpdate
                            ? 'This version is no longer supported. Please update to continue using Genfess.'
                            : 'A new version is available with improvements and bug fixes.')}
                    </p>

                    {forceUpdate && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-2">
                                <span>⚠️</span>
                                <span>You must update to continue using Genfess</span>
                            </p>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <p className="text-xs text-blue-600 dark:text-blue-400 text-left space-y-1">
                            <span className="block font-bold mb-2">📱 Installation Instructions:</span>
                            <span className="block">1. Tap "Download Update" below</span>
                            <span className="block">2. Your browser will download the APK file</span>
                            <span className="block">3. Open the downloaded file</span>
                            <span className="block">4. Tap "Install" to update</span>
                            <span className="block mt-2">✅ Safe & Verified Update</span>
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleUpdate}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span>Download Update</span>
                        </button>

                        {!forceUpdate && onClose && (
                            <button
                                onClick={onClose}
                                className="w-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-primary-text dark:text-dark-primary-text font-semibold py-3 px-6 rounded-xl transition-all duration-200 active:scale-95"
                            >
                                Remind Me Later
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-secondary-text dark:text-dark-secondary-text mt-4">
                        Download from our official website
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UpdateModal;
