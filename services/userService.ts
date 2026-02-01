
import { User } from '../types/index';
import { supabase } from './supabaseClient';
import { AVATAR_COLORS } from '../constants/config';

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const PROFILE_FIELDS = 'id, anon_id, display_name, avatar_color, college, department, has_onboarded';
const USER_STORAGE_KEY = 'lastbench_user_cache';

// PUBLIC VAPID KEY (You should generate your own in production via web-push library)
const VAPID_PUBLIC_KEY = 'BJ9f_post_your_own_generated_key_here_or_use_a_library_to_gen_one_B82xL2';

// IN-MEMORY CACHE
let currentUserCache: User | null = null;
let currentAuthIdCache: string | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 300000; // 5 minutes cache validity

const mapProfileToUser = (profile: any, authId: string): User => {
    return {
        userId: authId,
        anonId: profile.anon_id,
        displayName: profile.display_name || '',
        department: profile.department || '',
        college: profile.college || '',
        avatarColor: profile.avatar_color || AVATAR_COLORS[0],
        avatarUrl: profile.avatar_url,
        hasOnboarded: profile.has_onboarded || false,
    };
};

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

import { initializeFCM } from './fcmService';

/**
 * Register push notifications using the new FCM service
 * WHY: Centralized FCM handling with better error handling and multi-device support
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

export const getCurrentUser = async (forceRefresh = false): Promise<User | null> => {
    const now = Date.now();

    // 1. FASTEST: Memory Cache
    if (!forceRefresh && currentUserCache && currentAuthIdCache && (now - lastFetchTime < CACHE_TTL)) {
        return currentUserCache;
    }

    // 2. FAST: LocalStorage (Persist across reloads) - Return immediately for better UX
    if (!forceRefresh && !currentUserCache) {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                currentUserCache = parsed;
                // Return cached user immediately, verify and refresh session in background
                // This prevents login screen flash on app restart
                verifyAndRefreshSessionInBackground(parsed);
                return parsed;
            } catch (e) {
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        }
    }

    // 3. NETWORK: Check Supabase Session
    const { data: { session }, error } = await supabase.auth.getSession();

    // If we have a session but it might be expired, try to refresh it
    if (session && !error) {
        try {
            // Check if session is close to expiring (within 10 minutes)
            const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
            const now = Date.now();
            if (expiresAt > 0 && (expiresAt - now) < 10 * 60 * 1000) {
                // Try to refresh the session proactively
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                if (!refreshError && refreshData.session) {
                    // Session refreshed, continue with the refreshed session
                    return await getCurrentUserWithSession(refreshData.session, forceRefresh);
                }
            }
        } catch (refreshErr) {
            // Refresh failed, continue with original session
        }
    }

    if (error || !session) {
        // Try to refresh session before giving up
        try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshData.session) {
                return await getCurrentUserWithSession(refreshData.session, forceRefresh);
            }
        } catch (refreshErr) {
            // Refresh failed
        }

        // Only clear cache if it's a real error (not just expired token)
        if (error && (error.status === 500 || error.message?.includes('missing destination name'))) {
            await supabase.auth.signOut();
            currentUserCache = null;
            currentAuthIdCache = null;
            localStorage.removeItem(USER_STORAGE_KEY);
        }
        // If we have cached user, return it even if session check failed
        // This allows offline usage and prevents forced re-login
        if (currentUserCache) {
            return currentUserCache;
        }
        return null;
    }

    return await getCurrentUserWithSession(session, forceRefresh);
};

// Helper function to verify and refresh session in background without blocking
const verifyAndRefreshSessionInBackground = async (cachedUser: User) => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        // Always try to refresh the session to keep user logged in
        if (!error && session) {
            // Check if session needs refresh (within 30 minutes of expiry)
            const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
            const now = Date.now();
            if (expiresAt > 0 && (expiresAt - now) < 30 * 60 * 1000) {
                try {
                    await supabase.auth.refreshSession();
                } catch (refreshErr) {
                    // Refresh failed, but don't clear cache yet
                }
            }

            // Verify user ID matches
            if (session.user.id !== cachedUser.userId) {
                // User ID mismatch, clear cache
                currentUserCache = null;
                currentAuthIdCache = null;
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        } else {
            // No session or error, try to refresh
            try {
                const { data: refreshData } = await supabase.auth.refreshSession();
                if (!refreshData?.session) {
                    // Session truly invalid, but keep cached user for offline use
                    // Don't clear cache here - let user continue using app
                }
            } catch (refreshErr) {
                // Refresh failed, but keep cached user for offline use
            }
        }
    } catch (e) {
        // Silently fail background verification
    }
};

// Helper function to get user with a known session
const getCurrentUserWithSession = async (session: any, forceRefresh: boolean): Promise<User | null> => {
    if (!forceRefresh && currentUserCache && currentAuthIdCache === session.user.id) {
        return currentUserCache;
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('id', session.user.id)
        .single();

    if (profileError || !profile) {
        // If we have cached user, return it even if profile fetch failed
        if (currentUserCache) {
            return currentUserCache;
        }
        return null;
    }

    const user = mapProfileToUser(profile, session.user.id);
    currentUserCache = user;
    currentAuthIdCache = session.user.id;
    lastFetchTime = Date.now();
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    return user;
};

export const loginUser = async (email: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    if (data.user) {
        currentUserCache = null;
        return await getCurrentUser(true);
    }
    return null;
};

export const signUpUser = async (email: string, password: string): Promise<User | null> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) throw error;

    if (data.user) {
        const anonId = `Student#${Math.floor(Math.random() * 9000) + 1000}`;
        const newProfile = {
            id: data.user.id,
            anon_id: anonId,
            display_name: email.split('@')[0],
            avatar_color: getRandomElement(AVATAR_COLORS),
            has_onboarded: false
        };

        const { error: profileError } = await supabase
            .from('profiles')
            .insert(newProfile);

        if (profileError) {
            console.error("Error creating profile:", profileError);
            return null;
        }

        return mapProfileToUser(newProfile, data.user.id);
    }
    return null;
};

export const saveUser = async (user: User): Promise<void> => {
    const { error } = await supabase
        .from('profiles')
        .update({
            display_name: user.displayName,
            department: user.department,
            college: user.college?.trim(),
            avatar_color: user.avatarColor,
            has_onboarded: user.hasOnboarded
        })
        .eq('id', user.userId);

    if (error) {
        console.error("Error updating user:", error);
    } else {
        currentUserCache = user;
        lastFetchTime = Date.now();
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
};

export const uploadAvatar = async (file: File): Promise<string | null> => {
    return uploadImage(file, 'avatars');
};

export const uploadPostImage = async (file: File): Promise<string | null> => {
    return uploadImage(file, 'avatars');
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Compress image before uploading to improve performance
const compressImage = async (file: File): Promise<File> => {
    // Skip small files
    if (file.size < 200000) return file;

    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_WIDTH = 1200; // Reasonable max width for mobile view
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
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
                }, 'image/jpeg', 0.7); // 70% Quality
            } else {
                resolve(file);
            }
        };
        img.onerror = () => resolve(file);
    });
};

const uploadImage = async (file: File, bucket: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Compress before upload
    const compressedFile = await compressImage(file);

    const userId = session.user.id;
    const fileExt = compressedFile.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}_${fileName}`;

    try {
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, compressedFile, { upsert: true });

        if (uploadError) {
            console.warn(`Storage upload failed (${uploadError.message}), attempting Base64 fallback...`);
            throw uploadError;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;

    } catch (e) {
        try {
            console.log("Using Base64 fallback for image.");
            const base64Data = await fileToBase64(compressedFile);
            return base64Data;
        } catch (conversionError) {
            console.error("Base64 conversion failed", conversionError);
            return null;
        }
    }
}

export const logoutUser = async (): Promise<void> => {
    await supabase.auth.signOut();
    currentUserCache = null;
    currentAuthIdCache = null;
    lastFetchTime = 0;
    localStorage.removeItem(USER_STORAGE_KEY);
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            currentUserCache = null;
            currentAuthIdCache = null;
            lastFetchTime = 0;
            localStorage.removeItem(USER_STORAGE_KEY);
        }
        callback(event, session);
    });
};

export const getExistingColleges = async (): Promise<string[]> => {
    const { data, error } = await supabase.from('profiles').select('college');
    if (error) return [];
    const colleges = new Set<string>();
    data?.forEach((p: any) => {
        if (p.college && p.college.trim()) colleges.add(p.college.trim());
    });
    return Array.from(colleges);
};

export const getUser = () => currentUserCache;
