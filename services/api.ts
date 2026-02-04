/**
 * ============================================================================
 * API SERVICE - Firebase Implementation
 * ============================================================================
 * 
 * Central API module that re-exports all database operations
 * Uses a hybrid approach:
 * - Realtime Database for profiles (simpler permissions)
 * - Firestore for posts, comments, interactions (complex queries)
 * 
 * ============================================================================
 */

// Re-export everything from the Firestore service for posts/comments
export {
    // Posts - Read
    getPosts,
    getPostById,
    getUserPosts,
    getLikedPosts,
    getCachedPosts,

    // Posts - Write
    createPost,
    updatePost,
    deletePost,

    // Interactions
    toggleLike,

    // Comments
    getComments,
    addComment,
    toggleCommentLike,
    getCommentRepliesCount,
    subscribeToCommentCount,
    subscribeToCommentReplies,

    // Bookmarks (Saved Posts)
    toggleBookmark,
    getUserBookmarkedPostIds,
    getSavedPosts,

    // Shares
    sharePost,
    recordShare,

    // Reports
    submitReport,

    // Realtime
    subscribeToNewPosts,
    subscribeToPostUpdates,

    // Utilities
    mapDocToPost as mapDbPostToPost,
    getExistingColleges,
    mapDocToPost,
} from './firestoreService';

// Re-export profile operations from userService (now using Realtime DB)
export {
    getUserProfile,
    getCurrentUser,
    saveUser,
    signUpUser,
    loginUser,
    logoutUser,
} from './userService';