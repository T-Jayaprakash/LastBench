
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import HomeFeed from './views/HomeFeed';
import CreatePostView from './views/CreatePostView';
import ProfileView from './views/ProfileView';
import BottomNav from './components/BottomNav';
import { t } from './constants/locales';
import { Post, User, PostTag, View, Theme } from './types/index';
import * as api from './services/api';
import * as userService from './services/userService';
import LoginView from './views/LoginView';
import OnboardingView from './views/OnboardingView';
import SignUpView from './views/SignUpView';
import { ToastProvider, useToast } from './components/Toast'; // Import Provider and hook
import { ErrorBoundary } from './components/ErrorBoundary';
import { checkVersion, shouldCheckVersion, markVersionChecked, getCurrentVersion } from './services/versionService';

// Lazy Load heavy components to improve initial rendering speed
const CommentView = lazy(() => import('./views/CommentView'));
const ReportModal = lazy(() => import('./components/ReportModal'));
const PostOptionsModal = lazy(() => import('./components/PostOptionsModal'));
const EditPostModal = lazy(() => import('./components/EditPostModal'));
const ImageViewer = lazy(() => import('./components/ImageViewer'));
const NotificationsView = lazy(() => import('./views/NotificationsView'));
const UpdateModal = lazy(() => import('./components/UpdateModal'));



const SplashScreen = ({ isFinished }: { isFinished: boolean }) => {
    if (!isFinished) {
        return (
            <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background dark:bg-dark-background overflow-hidden`}>
                <div className="absolute inset-0 opacity-40 dark:opacity-20 blur-[100px] animate-aurora"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 50% 50%, #0095f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #d62976 0%, transparent 50%)',
                        backgroundSize: '200% 200%'
                    }}>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <h1 className="text-7xl text-primary-text dark:text-dark-primary-text font-logo animate-text-blur-reveal tracking-wide drop-shadow-xl">
                        Genfess
                    </h1>
                    <p className="mt-6 text-lg text-secondary-text dark:text-dark-secondary-text animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        {t.splashTagline}
                    </p>
                    <div className="mt-10 w-32 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
                        <div className="h-full bg-accent-primary animate-slide-in-right" style={{ animationDuration: '1s' }}></div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const AppContent: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState<View>('home');
    const [commentingPost, setCommentingPost] = useState<Post | null>(null);
    const [reportingPost, setReportingPost] = useState<Post | null>(null);
    const [optionsPost, setOptionsPost] = useState<Post | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [theme, setTheme] = useState<Theme>('dark');
    const [authView, setAuthView] = useState<'login' | 'signup'>('login');
    const [latestPost, setLatestPost] = useState<Post | null>(null);
    const [deletedPostId, setDeletedPostId] = useState<string | null>(null);
    const [viewingImages, setViewingImages] = useState<string[] | null>(null);
    const [viewingImageIndex, setViewingImageIndex] = useState(0);
    const historyStackRef = useRef<Array<{ view: View; hasModal: boolean }>>([{ view: 'home', hasModal: false }]);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [updatedPost, setUpdatedPost] = useState<Post | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<any>(null);


    // Use Toast for share notifications
    const { showToast } = useToast();

    const handleShareSuccess = (message: string) => {
        showToast(message, 'success');
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as Theme | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        const checkUser = async () => {
            const startTime = Date.now();

            try {
                const currentUser = await userService.getCurrentUser();
                setUser(currentUser);

                // Check for app updates after successful auth
                if (shouldCheckVersion()) {
                    const versionCheck = await checkVersion();
                    console.log('Version check result:', versionCheck);
                    console.log('Current app version:', getCurrentVersion());

                    if (versionCheck.needsUpdate || versionCheck.forceUpdate) {
                        setUpdateInfo(versionCheck.versionInfo);
                        setShowUpdateModal(true);
                    }

                    markVersionChecked();
                }

                // Initialize FCM on load
                userService.registerPushSubscription();
            } catch (e) {
                console.error("Auth check failed", e);
                setUser(null);
            } finally {
                // Ensure splash screen shows for at least 3 seconds for smooth experience
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, 3000 - elapsedTime);

                setTimeout(() => {
                    setIsLoading(false);
                }, remainingTime);
            }
        };
        checkUser();

        const { data: authListener } = userService.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                const currentUser = await userService.getCurrentUser();
                setUser(currentUser);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const navigateTo = (view: View) => {
        if (currentView === view) return;
        window.history.pushState({ view }, '');
        historyStackRef.current.push({ view, hasModal: false });
        setCurrentView(view);
    };

    const handleCreatePost = async (postContent: { text: string; images?: string[]; tags: PostTag[] }) => {
        if (!user) return;

        // Optimistic UI: Assume success, view handles the async call
        // We just need to receive the result when it's eventually done
        // But since we are changing architecture to allow "Background Posting"
        // The view will handle the API call internally and call a callback on success
        // Here we just prepare to receive a potential new post
    };

    const handlePostSuccess = (newPost: Post) => {
        setLatestPost(newPost);
        navigateTo('home');
    };

    const handleUpdateUser = async (updatedUser: User) => {
        await userService.saveUser(updatedUser);
        setUser(updatedUser);
    };

    const handleLogin = (loggedInUser: User) => {
        setUser(loggedInUser);
        setAuthView('login');
        // Request notification permission on login
        userService.registerPushSubscription();
    };

    const handleSignUp = (signedUpUser: User) => {
        setUser(signedUpUser);
        setAuthView('login');
    };

    const handleOnboardingComplete = async (updatedUserData: { displayName: string, college: string, department: string, avatarColor: string }) => {
        if (!user) return;
        const fullyUpdatedUser: User = {
            ...user,
            ...updatedUserData,
            hasOnboarded: true,
        };
        await userService.saveUser(fullyUpdatedUser);
        setUser(fullyUpdatedUser);
        // Request notification permission after onboarding
        userService.registerPushSubscription();
    };

    const handleLogout = async () => {
        await userService.logoutUser();
        setUser(null);
        navigateTo('home');
    };

    const handleShowComments = (post: Post) => {
        window.history.pushState({ modal: 'comments', view: currentView }, '');
        historyStackRef.current.push({ view: currentView, hasModal: true });
        setCommentingPost(post);
    };

    const handleShowReport = (post: Post) => {
        window.history.pushState({ modal: 'report', view: currentView }, '');
        historyStackRef.current.push({ view: currentView, hasModal: true });
        setReportingPost(post);
    };

    const handleShowOptions = (post: Post) => {
        window.history.pushState({ modal: 'options', view: currentView }, '');
        historyStackRef.current.push({ view: currentView, hasModal: true });
        setOptionsPost(post);
    };

    const handleViewImages = (images: string[], index: number) => {
        window.history.pushState({ modal: 'images', view: currentView }, '');
        historyStackRef.current.push({ view: currentView, hasModal: true });
        setViewingImages(images);
        setViewingImageIndex(index);
    };

    const handleCloseComments = () => {
        if (historyStackRef.current.length > 1) {
            historyStackRef.current.pop();
        }
        window.history.back();
    };
    const handleCloseReport = (wasDeleted?: boolean) => {
        if (historyStackRef.current.length > 1) {
            historyStackRef.current.pop();
        }
        window.history.back();
        if (wasDeleted && reportingPost) {
            setDeletedPostId(reportingPost.id);
        }
    };
    const handleCloseOptions = () => {
        if (historyStackRef.current.length > 1) {
            historyStackRef.current.pop();
        }
        window.history.back();
    };
    const handleCloseImages = () => {
        if (historyStackRef.current.length > 1) {
            historyStackRef.current.pop();
        }
        window.history.back();
    };

    // Handle Android back button and browser history
    useEffect(() => {
        window.history.replaceState({ view: 'home' }, '');
        historyStackRef.current = [{ view: 'home', hasModal: false }];

        const onPopState = (event: PopStateEvent) => {
            const state = event.state;
            setCommentingPost(null);
            setReportingPost(null);
            setOptionsPost(null);
            setViewingImages(null);

            // Update history stack
            if (historyStackRef.current.length > 1) {
                historyStackRef.current.pop();
            }

            if (state && state.view) {
                setCurrentView(state.view);
            } else {
                setCurrentView('home');
            }
        };
        window.addEventListener('popstate', onPopState);

        // Handle Android back button
        const handleBackButton = async () => {
            // If any modal is open, close it
            if (viewingImages) {
                handleCloseImages();
                return;
            }
            if (commentingPost) {
                handleCloseComments();
                return;
            }
            if (reportingPost) {
                handleCloseReport();
                return;
            }
            if (optionsPost) {
                handleCloseOptions();
                return;
            }

            // If not on home view, navigate to home
            if (currentView !== 'home') {
                // Clear history stack and go to home
                historyStackRef.current = [{ view: 'home', hasModal: false }];
                window.history.replaceState({ view: 'home' }, '');
                setCurrentView('home');
                return;
            }

            // If on home view and no history, exit app
            if (historyStackRef.current.length <= 1) {
                CapacitorApp.exitApp();
            } else {
                // Go back in history
                if (historyStackRef.current.length > 1) {
                    historyStackRef.current.pop();
                }
                window.history.back();
            }
        };

        let backButtonListener: any;
        const setupListener = async () => {
            backButtonListener = await CapacitorApp.addListener('backButton', handleBackButton);
        };
        setupListener();

        return () => {
            window.removeEventListener('popstate', onPopState);
            if (backButtonListener) backButtonListener.remove();
        };
    }, [currentView, viewingImages, commentingPost, reportingPost, optionsPost]);

    const handleShowEdit = (post: Post) => {
        handleCloseOptions();
        setEditingPost(post);
    };

    const handleCloseEdit = () => {
        setEditingPost(null);
    };

    const handleSaveEdit = async (text: string) => {
        if (!editingPost) return;
        const success = await api.updatePost(editingPost.id, text);
        if (success) {
            setUpdatedPost({ ...editingPost, text });
            handleCloseEdit();
        } else {
            alert("Failed to update post.");
        }
    };

    const handleDeletePost = async (postId: string) => {
        const success = await api.deletePost(postId);
        if (success) {
            handleCloseOptions();
            setDeletedPostId(postId);
            setViewingImages(null);
            setCommentingPost(null);
            setOptionsPost(null);
            setTimeout(() => {
                if (currentView !== 'home') {
                    window.history.replaceState({ view: 'home' }, '');
                    setCurrentView('home');
                }
            }, 50);
        } else {
            alert("Failed to delete post.");
        }
    };

    if (isLoading) {
        return <SplashScreen isFinished={false} />;
    }

    if (!user) {
        if (authView === 'signup') {
            return <SignUpView onSignUp={handleSignUp} onNavigateToLogin={() => setAuthView('login')} />;
        }
        return <LoginView onLogin={handleLogin} onNavigateToSignUp={() => setAuthView('signup')} />;
    }

    if (!user.hasOnboarded) {
        return <OnboardingView user={user} onComplete={handleOnboardingComplete} />;
    }

    return (
        <div className="flex flex-col h-screen w-screen max-w-md mx-auto bg-background dark:bg-dark-background overflow-hidden relative shadow-2xl">
            <main className="flex-grow overflow-hidden relative">
                <div className={`h-full w-full ${currentView === 'home' ? 'block' : 'hidden'}`}>
                    <HomeFeed
                        user={user}
                        onCommentClick={handleShowComments}
                        onOptionsClick={handleShowOptions}
                        onViewImages={handleViewImages}
                        newPost={latestPost}
                        deletedPostId={deletedPostId}
                        updatedPost={updatedPost}
                        onNotificationClick={() => navigateTo('notifications')}
                        onShareSuccess={handleShareSuccess}
                    />
                </div>

                {currentView === 'create' && (
                    <CreatePostView
                        onPostSuccess={handlePostSuccess}
                        onCancel={() => window.history.back()}
                    />
                )}

                {currentView === 'profile' && (
                    <ProfileView
                        user={user}
                        onUpdateUser={handleUpdateUser}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        onLogout={handleLogout}
                        onViewImages={handleViewImages}
                    />
                )}

                {currentView === 'notifications' && (
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-accent-primary border-t-transparent rounded-full"></div></div>}>
                        <NotificationsView userId={user.userId} onBack={() => window.history.back()} />
                    </Suspense>
                )}
            </main>

            {currentView !== 'create' && currentView !== 'notifications' && (
                <BottomNav currentView={currentView} setView={navigateTo} />
            )}

            <Suspense fallback={null}>
                {commentingPost && (
                    <CommentView post={commentingPost} onBack={handleCloseComments} />
                )}
                {reportingPost && (
                    <ReportModal post={reportingPost} onClose={() => handleCloseReport()} onDeleteBroadcast={(id) => setDeletedPostId(id)} />
                )}
                {optionsPost && (
                    <PostOptionsModal
                        post={optionsPost}
                        currentUser={user}
                        onClose={handleCloseOptions}
                        onDelete={() => handleDeletePost(optionsPost.id)}
                        onEdit={() => handleShowEdit(optionsPost)}
                        onReport={() => {
                            const postToReport = optionsPost;
                            handleCloseOptions();
                            setTimeout(() => {
                                if (postToReport) handleShowReport(postToReport);
                            }, 350);
                        }}
                    />
                )}
                {editingPost && (
                    <EditPostModal
                        post={editingPost}
                        onClose={handleCloseEdit}
                        onSave={handleSaveEdit}
                    />
                )}
                {viewingImages && (
                    <ImageViewer
                        images={viewingImages}
                        initialIndex={viewingImageIndex}
                        onClose={handleCloseImages}
                    />
                )}
                {showUpdateModal && updateInfo && (
                    <UpdateModal
                        version={updateInfo.latestVersion}
                        message={updateInfo.message}
                        updateUrl={updateInfo.updateUrl}
                        forceUpdate={updateInfo.forceUpdate}
                        onClose={updateInfo.forceUpdate ? undefined : () => setShowUpdateModal(false)}
                    />
                )}
            </Suspense>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <ErrorBoundary>
                <AppContent />
            </ErrorBoundary>
        </ToastProvider>
    );
};

export default App;
