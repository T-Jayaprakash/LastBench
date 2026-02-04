
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser
} from 'firebase/auth';
import { auth, db } from './firebase'; // Ensure firebase.ts exports auth and db
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from '../types';
import { AVATAR_COLORS } from '../constants/config';
import { isCollegeEmail, getCollegeFromEmail } from './emailVerificationService';

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Convert Firestore User Doc to App User Type
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

export const signUpUser = async (email: string, password: string): Promise<User | null> => {
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
            created_at: new Date().toISOString()
        };

        // Create user profile in Firestore
        await setDoc(doc(db, 'profiles', fbUser.uid), newProfile);

        return mapDocToUser(newProfile, fbUser.uid);
    } catch (error: any) {
        console.error("Error signing up:", error);
        throw error;
    }
};

export const loginUser = async (email: string, password: string): Promise<User | null> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return await getUserProfile(userCredential.user.uid);
    } catch (error: any) {
        console.error("Error logging in:", error);
        throw error;
    }
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
    try {
        const docRef = doc(db, 'profiles', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return mapDocToUser(docSnap.data(), uid);
        } else {
            // Profile doesn't exist? Should not happen for valid users, but handle gracefully
            console.warn("User profile missing for ID:", uid);
            return null;
        }
    } catch (e) {
        console.error("Error fetching user profile:", e);
        return null;
    }
};

export const observeAuthState = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
            const user = await getUserProfile(fbUser.uid);
            callback(user);
        } else {
            callback(null);
        }
    });
};
