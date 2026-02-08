
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import HomeFeed from './views/HomeFeed';
import CreatePostView from './views/CreatePostView';
import ProfileView from './views/ProfileView';
import BottomNav from './components/BottomNav';
import SwipeableViews from './components/SwipeableViews';
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
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { useUnreadNotifications } from './src/hooks/useUnreadNotifications';

// Lazy Load heavy components to improve initial rendering speed
const CommentView = lazy(() => import('./views/CommentView'));
const ReportModal = lazy(() => import('./components/ReportModal'));
const PostOptionsModal = lazy(() => import('./components/PostOptionsModal'));
const EditPostModal = lazy(() => import('./components/EditPostModal'));
const ImageViewer = lazy(() => import('./components/ImageViewer'));
const NotificationsView = lazy(() => import('./views/NotificationsView'));
const UpdateModal = lazy(() => import('./components/UpdateModal'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const ReelsView = lazy(() => import('./views/ReelsView'));
const DebateView = lazy(() => import('./views/DebateView'));
const BannerDetailsModal = lazy(() => import('./components/BannerDetailsModal'));


const SplashScreen = ({ isFinished }: { isFinished: boolean }) => {
    if (!isFinished) {
        return (
            <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#E53935] overflow-hidden`}>
                <div className="absolute inset-0 opacity-40 blur-[100px] animate-pulse"
                    style={{
                        background: 'radial-gradient(circle at 50% 50%, #800000 0%, transparent 70%)',
                    }}>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <img
                        src="/assets/Genfess.png"
                        alt="Logo"
                        className="w-32 h-32 mb-6 rounded-2xl shadow-2xl animate-fade-in-up"
                    />
                    <h1 className="text-6xl text-white font-logo animate-text-blur-reveal tracking-wide drop-shadow-xl" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        Genfess
                    </h1>
                    <p className="mt-4 text-lg text-white/80 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        {t.splashTagline}
                    </p>
                    <div className="mt-10 w-32 h-1 bg-white/10 rounded-full overflow-hidden animate-fade-in" style={{ animationDelay: '0.4s' }}>
                        <div className="h-full bg-white animate-slide-in-right" style={{ animationDuration: '1s' }}></div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

// Define swipeable views for navigation
const SWIPEABLE_VIEWS: View[] = ['home', 'debate', 'notifications', 'profile'];

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
    const [viewingBanner, setViewingBanner] = useState<Post | null>(null);
    const [viewingImageIndex, setViewingImageIndex] = useState(0);
    const historyStackRef = useRef<Array<{ view: View; hasModal: boolean }>>([{ view: 'home', hasModal: false }]);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [updatedPost, setUpdatedPost] = useState<Post | null>(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [showPWAInstall, setShowPWAInstall] = useState(true);
    const unreadCount = useUnreadNotifications(user?.userId);

    // Track last swipe view to keep it active when hidden
    const lastSwipeView = useRef<View>('home');

    // Check if any modal is open (for disabling swipe)
    const isModalOpen = !!(commentingPost || reportingPost || optionsPost || editingPost || viewingImages || viewingBanner);

    // Use Toast for share notifications
    const { showToast } = useToast();

    // Update last swipe view ref whenever currentView changes to a swipeable view
    if (SWIPEABLE_VIEWS.includes(currentView)) {
        lastSwipeView.current = currentView;
    }

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

    // Handle swipe navigation for main views
    const handleSwipeViewChange = (view: View) => {
        if (currentView === view || isModalOpen) return;

        // Don't push to history for swipe navigation between main tabs
        // Just update the view directly
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

    const handleOnboardingComplete = async (updatedUserData: { displayName: string, college: string, department: string, avatarColor: string, avatarUrl?: string }) => {
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

    const handleShowBanner = (post: Post) => {
        window.history.pushState({ modal: 'banner', view: currentView }, '');
        historyStackRef.current.push({ view: currentView, hasModal: true });
        setViewingBanner(post);
    };

    const handleCloseComments = () => {
        setCommentingPost(null);
        window.history.back();
    };

    const handleCloseReport = (wasDeleted?: boolean) => {
        if (wasDeleted && reportingPost) {
            setDeletedPostId(reportingPost.id);
        }
        setReportingPost(null);
        window.history.back();
    };

    const handleCloseOptions = () => {
        setOptionsPost(null);
        window.history.back();
    };

    const handleCloseImages = () => {
        setViewingImages(null);
        window.history.back();
    };

    const handleCloseBanner = () => {
        setViewingBanner(null);
        window.history.back();
    };

    // Handle Android back button and browser history
    useEffect(() => {
        window.history.replaceState({ view: 'home' }, '');
        historyStackRef.current = [{ view: 'home', hasModal: false }];

        const onPopState = (event: PopStateEvent) => {
            const state = event.state;

            // Close any open modals first (without calling window.history.back)
            if (commentingPost) {
                setCommentingPost(null);
                return;
            }
            if (reportingPost) {
                setReportingPost(null);
                return;
            }
            if (optionsPost) {
                setOptionsPost(null);
                return;
            }
            if (viewingImages) {
                setViewingImages(null);
                return;
            }
            if (editingPost) {
                setEditingPost(null);
                return;
            }
            if (viewingBanner) {
                setViewingBanner(null);
                return;
            }

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
            if (editingPost) {
                handleCloseEdit();
                return;
            }
            if (viewingBanner) {
                handleCloseBanner();
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
    }, [currentView, viewingImages, commentingPost, reportingPost, optionsPost, editingPost, viewingBanner]);

    const handleShowEdit = (post: Post) => {
        setOptionsPost(null); // Close options first (don't call handleCloseOptions to avoid double history.back)
        setTimeout(() => {
            window.history.pushState({ modal: 'edit', view: currentView }, '');
            historyStackRef.current.push({ view: currentView, hasModal: true });
            setEditingPost(post);
        }, 100);
    };

    const handleCloseEdit = () => {
        setEditingPost(null);
        window.history.back();
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
            setOptionsPost(null); // Close options without calling handleCloseOptions
            setDeletedPostId(postId);
            setViewingImages(null);
            setCommentingPost(null);

            // Go back to previous state
            window.history.back();

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

    // Check if current view is in swipeable views
    const isSwipeableView = SWIPEABLE_VIEWS.includes(currentView);

    return (
        <div className="flex flex-col h-screen w-screen max-w-md mx-auto bg-background dark:bg-dark-background overflow-hidden relative shadow-2xl">
            <main className="flex-grow overflow-hidden relative">
                {/* Swipeable Views Container - ALWAYS MOUNTED to prevent re-fetching */}
                <div className="h-full w-full" style={{ display: isSwipeableView ? 'block' : 'none' }}>
                    <SwipeableViews
                        views={SWIPEABLE_VIEWS}
                        currentView={SWIPEABLE_VIEWS.includes(currentView) ? currentView : lastSwipeView.current}
                        onViewChange={handleSwipeViewChange}
                        disabled={isModalOpen}
                    >
                        {/* Home */}
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
                            onBannerClick={handleShowBanner}
                        />

                        {/* Debate (was Reels) */}
                        <Suspense fallback={null}>
                            <DebateView user={user} isActive={currentView === 'debate'} />
                        </Suspense>

                        {/* Notifications */}
                        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-2 border-accent-primary border-t-transparent rounded-full"></div></div>}>
                            <NotificationsView userId={user.userId} onBack={() => navigateTo('home')} />
                        </Suspense>

                        {/* Profile */}
                        <ProfileView
                            user={user}
                            onUpdateUser={handleUpdateUser}
                            theme={theme}
                            toggleTheme={toggleTheme}
                            onSettingsClick={() => navigateTo('settings')}
                            onViewImages={handleViewImages}
                            onLogout={handleLogout}
                        />
                    </SwipeableViews>
                </div>

                {/* Non-swipeable views */}
                {currentView === 'create' && (
                    <CreatePostView
                        onPostSuccess={handlePostSuccess}
                        onCancel={() => window.history.back()}
                    />
                )}

                {currentView === 'settings' && (
                    <Suspense fallback={null}>
                        <SettingsView
                            user={user}
                            onBack={() => window.history.back()}
                            onLogout={handleLogout}
                            theme={theme}
                            toggleTheme={toggleTheme}
                        />
                    </Suspense>
                )}
            </main>

            {currentView !== 'create' && currentView !== 'settings' && (
                <BottomNav currentView={currentView} setView={navigateTo} userId={user.userId} unreadCount={unreadCount} />
            )}

            <Suspense fallback={null}>
                {commentingPost && (
                    <CommentView post={commentingPost} currentUser={user} onBack={handleCloseComments} />
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
                            setOptionsPost(null);
                            window.history.back();
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

            {/* PWA Install Prompt */}
            {showPWAInstall && (
                <PWAInstallPrompt onDismiss={() => setShowPWAInstall(false)} />
            )}

            {/* Banner Details Modal - High Z-Index to cover everything */}
            {viewingBanner && (
                <div className="fixed inset-0 z-[100]">
                    <Suspense fallback={null}>
                        <BannerDetailsModal
                            post={viewingBanner}
                            onClose={handleCloseBanner}
                            onViewImage={(url) => handleViewImages([url], 0)}
                        />
                    </Suspense>
                </div>
            )}
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
