/**
 * ============================================================================
 * USER SERVICE - Firebase Auth & Firestore User Management
 * ============================================================================
 * 
 * Handles all user authentication, profile management, and session handling
 * for production Play Store release.
 * 
 * Features:
 * - Email/Password authentication with Firebase Auth
 * - College email validation
 * - Profile persistence in Firestore
 * - Session caching for offline support
 * - Avatar upload to Firebase Storage
 * - Multi-device FCM token management
 * 
 * ============================================================================
 */

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
    UserCredential
} from 'firebase/auth';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { User } from '../types/index';
import { AVATAR_COLORS } from '../constants/config';
import { isCollegeEmail, getCollegeFromEmail } from './emailVerificationService';
import { initializeFCM } from './fcmService';

// ============================================================================
// CONSTANTS
// ============================================================================

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const PROFILE_FIELDS = ['id', 'anon_id', 'display_name', 'avatar_color', 'college', 'department', 'has_onboarded', 'avatar_url'];
const USER_STORAGE_KEY = 'genfess_user_cache_v2';
const CACHE_TTL = 300000; // 5 minutes

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

let currentUserCache: User | null = null;
let currentAuthIdCache: string | null = null;
let lastFetchTime = 0;

// ============================================================================
// PROFILE MAPPING
// ============================================================================

/**
 * Map Firestore profile document to User type
 */
const mapDocToUser = (docData: any, uid: string): User => {
    return {
        userId: uid,
        anonId: docData.anon_id || `Student#${uid.substring(0, 4)}`,
        displayName: docData.display_name || '',
        department: docData.department || '',
        college: docData.college || '',
        avatarColor: docData.avatar_color || AVATAR_COLORS[0],
        avatarUrl: docData.avatar_url,
        hasOnboarded: docData.has_onboarded || false,
    };
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Sign up a new user with email and password
 */
export const signUpUser = async (email: string, password: string): Promise<User | null> => {
    // Validate college email
    if (!isCollegeEmail(email)) {
        throw new Error('Please use a valid college email address.');
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        const college = getCollegeFromEmail(email) || 'Unknown College';

        const anonId = `Student#${Math.floor(Math.random() * 9000) + 1000}`;
        const newProfile = {
            anon_id: anonId,
            display_name: email.split('@')[0],
            avatar_color: getRandomElement(AVATAR_COLORS),
            has_onboarded: false,
            email: email,
            college: college,
            department: '',
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
        };

        // Create user profile in Firestore (using UID as doc ID)
        await setDoc(doc(db, 'profiles', fbUser.uid), newProfile);

        const user = mapDocToUser(newProfile, fbUser.uid);

        // Cache the user
        currentUserCache = user;
        currentAuthIdCache = fbUser.uid;
        lastFetchTime = Date.now();
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

        return user;
    } catch (error: any) {
        console.error("Error signing up:", error);

        // Provide user-friendly error messages
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('This email is already registered. Please login instead.');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Password should be at least 6 characters.');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Please enter a valid email address.');
        }

        throw error;
    }
};

/**
 * Login with email and password
 */
export const loginUser = async (email: string, password: string): Promise<User | null> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = await getUserProfile(userCredential.user.uid);

        if (user) {
            // Cache the user
            currentUserCache = user;
            currentAuthIdCache = userCredential.user.uid;
            lastFetchTime = Date.now();
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        }

        return user;
    } catch (error: any) {
        console.error("Error logging in:", error);

        // Provide user-friendly error messages
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            throw new Error('Invalid email or password.');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Too many failed attempts. Please try again later.');
        } else if (error.code === 'auth/invalid-credential') {
            throw new Error('Invalid email or password.');
        }

        throw error;
    }
};

/**
 * Logout current user
 */
export const logoutUser = async (): Promise<void> => {
    try {
        await signOut(auth);
    } finally {
        // Clear caches regardless of signOut success
        currentUserCache = null;
        currentAuthIdCache = null;
        lastFetchTime = 0;
        localStorage.removeItem(USER_STORAGE_KEY);
    }
};

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
    try {
        const docRef = doc(db, 'profiles', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return mapDocToUser(docSnap.data(), uid);
        } else {
            console.warn("User profile missing for ID:", uid);
            return null;
        }
    } catch (e) {
        console.error("Error fetching user profile:", e);
        return null;
    }
};

/**
 * Get current authenticated user with caching
 */
export const getCurrentUser = async (forceRefresh = false): Promise<User | null> => {
    const now = Date.now();

    // 1. FASTEST: Memory Cache (if valid)
    if (!forceRefresh && currentUserCache && currentAuthIdCache && (now - lastFetchTime < CACHE_TTL)) {
        return currentUserCache;
    }

    // 2. FAST: LocalStorage (for app restart)
    if (!forceRefresh && !currentUserCache) {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                currentUserCache = parsed;
                // Verify session in background
                verifySessionInBackground(parsed);
                return parsed;
            } catch (e) {
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        }
    }

    // 3. NETWORK: Check Firebase Auth State
    const fbUser = auth.currentUser;

    if (!fbUser) {
        // If we have cached user but no Firebase user, keep cached for offline use
        if (currentUserCache) {
            return currentUserCache;
        }
        return null;
    }

    // 4. Fetch fresh profile from Firestore
    const profile = await getUserProfile(fbUser.uid);

    if (profile) {
        currentUserCache = profile;
        currentAuthIdCache = fbUser.uid;
        lastFetchTime = Date.now();
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
        return profile;
    }

    // Return cached user if Firestore fetch failed
    if (currentUserCache) {
        return currentUserCache;
    }

    return null;
};

/**
 * Verify session validity in background
 */
const verifySessionInBackground = async (cachedUser: User) => {
    try {
        const fbUser = auth.currentUser;

        if (fbUser) {
            // Verify user ID matches
            if (fbUser.uid !== cachedUser.userId) {
                // User ID mismatch, clear cache
                currentUserCache = null;
                currentAuthIdCache = null;
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        } else {
            // No Firebase user, but keep cache for offline use
            // Firebase will re-authenticate on next network availability
        }
    } catch (e) {
        // Silently fail background verification
        console.error("Background session verification failed:", e);
    }
};

/**
 * Save/update user profile
 */
export const saveUser = async (user: User): Promise<void> => {
    try {
        const docRef = doc(db, 'profiles', user.userId);

        await updateDoc(docRef, {
            display_name: user.displayName,
            department: user.department,
            college: user.college?.trim(),
            avatar_color: user.avatarColor,
            avatar_url: user.avatarUrl || null,
            has_onboarded: user.hasOnboarded,
            updated_at: serverTimestamp(),
        });

        // Update caches
        currentUserCache = user;
        lastFetchTime = Date.now();
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

        console.log('✅ User profile saved');
    } catch (error) {
        console.error("Error saving user:", error);
        throw error;
    }
};

// ============================================================================
// AVATAR UPLOAD
// ============================================================================

/**
 * Compress image before upload
 */
const compressImage = async (file: File): Promise<File> => {
    // Skip small files
    if (file.size < 200000) return file;

    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_SIZE = 1200;

            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;

            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', 0.7);
            } else {
                resolve(file);
            }

            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => resolve(file);
    });
};

/**
 * Convert file to base64 (fallback for storage issues)
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

/**
 * Upload image to Firebase Storage
 */
const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const fbUser = auth.currentUser;
    if (!fbUser) return null;

    try {
        // Compress before upload
        const compressedFile = await compressImage(file);

        const userId = fbUser.uid;
        const fileExt = compressedFile.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${folder}/${userId}/${fileName}`;

        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, compressedFile);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        console.log('✅ Image uploaded:', downloadUrl);
        return downloadUrl;
    } catch (error) {
        console.warn('Storage upload failed, using Base64 fallback:', error);

        try {
            const base64Data = await fileToBase64(file);
            return base64Data;
        } catch (conversionError) {
            console.error("Base64 conversion failed:", conversionError);
            return null;
        }
    }
};

/**
 * Upload avatar image
 */
export const uploadAvatar = async (file: File): Promise<string | null> => {
    return uploadImage(file, 'avatars');
};

/**
 * Upload post image
 */
export const uploadPostImage = async (file: File): Promise<string | null> => {
    return uploadImage(file, 'posts');
};

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

/**
 * Register push notifications using FCM service
 */
export const registerPushSubscription = async () => {
    const user = await getCurrentUser();
    if (!user || !user.college) {
        console.warn('Cannot register push: User not logged in or no college set');
        return;
    }

    try {
        const success = await initializeFCM();
        if (success) {
            console.log('✅ Push notifications registered successfully');
        } else {
            console.warn('⚠️ Push notification registration failed or was denied');
        }
    } catch (error) {
        console.error('❌ Error registering push notifications:', error);
    }
};

// ============================================================================
// AUTH STATE OBSERVER
// ============================================================================

/**
 * Subscribe to authentication state changes
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
            const user = await getUserProfile(fbUser.uid);
            if (user) {
                currentUserCache = user;
                currentAuthIdCache = fbUser.uid;
                lastFetchTime = Date.now();
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            }
            callback('SIGNED_IN', { user: fbUser });
        } else {
            currentUserCache = null;
            currentAuthIdCache = null;
            lastFetchTime = 0;
            localStorage.removeItem(USER_STORAGE_KEY);
            callback('SIGNED_OUT', null);
        }
    });

    // Return object matching Supabase API for compatibility
    return {
        data: {
            subscription: {
                unsubscribe: unsubscribe
            }
        }
    };
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get existing colleges for autocomplete
 */
export { getExistingColleges } from './firestoreService';

/**
 * Get current user from memory cache (sync)
 */
export const getUser = () => currentUserCache;
