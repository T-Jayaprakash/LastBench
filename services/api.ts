/**
 * ============================================================================
 * API SERVICE - Firebase Firestore Implementation
 * ============================================================================
 * 
 * Central API module that re-exports all database operations
 * This file maintains backward compatibility while using Firebase Firestore
 * 
 * All actual implementations are in firestoreService.ts
 * 
 * ============================================================================
 */

// Re-export everything from the Firestore service
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

    // Reports
    submitReport,

    // Realtime
    subscribeToNewPosts,
    subscribeToPostUpdates,

    // Utilities
    mapDocToPost as mapDbPostToPost,
    getExistingColleges,
} from './firestoreService';

// Re-export Post type mapping for backward compatibility
export { mapDocToPost } from './firestoreService';