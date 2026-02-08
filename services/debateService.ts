import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    setDoc,
    onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Debate, DebateTake, VoteType } from '../types';
import { getCurrentUser } from './userService';

const COLLECTIONS = {
    DEBATES: 'debates',
    TAKES: 'takes',
    VOTES: 'votes',
    OPINION_VOTES: 'opinion_votes'
};

/**
 * Get the active debate for a college
 */
export const getActiveDebate = async (college: string): Promise<Debate | null> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DEBATES),
            where('college', '==', college),
            where('isActive', '==', true),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const data = snapshot.docs[0].data();
        return {
            id: snapshot.docs[0].id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            endsAt: data.endsAt?.toDate?.() || new Date(),
        } as Debate;
    } catch (e) {
        console.error('Error fetching active debate', e);
        return null;
    }
};

/**
 * Subscribe to debate stats (realtime)
 */
export const subscribeToDebate = (debateId: string, callback: (debate: Debate) => void) => {
    const docRef = doc(db, COLLECTIONS.DEBATES, debateId);
    return onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            callback({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                endsAt: data.endsAt?.toDate?.() || new Date(),
            } as Debate);
        }
    });
};

/**
 * Vote on the main debate topic (Agree/Neutral/Disagree)
 */
export const voteOnDebate = async (debateId: string, voteType: VoteType): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) return false;

    const voteRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.OPINION_VOTES, user.userId);
    const debateRef = doc(db, COLLECTIONS.DEBATES, debateId);

    try {
        const voteDoc = await getDoc(voteRef);

        if (voteDoc.exists()) {
            const oldVote = voteDoc.data().type as VoteType;
            if (oldVote === voteType) return true; // No change

            // Change vote
            await updateDoc(voteRef, { type: voteType, updatedAt: serverTimestamp() });

            // Update stats
            await updateDoc(debateRef, {
                [`stats.${oldVote}`]: increment(-1),
                [`stats.${voteType}`]: increment(1)
            });
        } else {
            // New vote
            await setDoc(voteRef, { type: voteType, userId: user.userId, createdAt: serverTimestamp() });
            await updateDoc(debateRef, {
                [`stats.${voteType}`]: increment(1),
                [`stats.total`]: increment(1)
            });
        }
        return true;
    } catch (e) {
        console.error('Error voting on debate', e);
        return false;
    }
};

/**
 * Post a take (opinion)
 */
export const postDebateTake = async (debateId: string, text: string, type: 'text' | 'emoji' | 'gif' | 'sticker' = 'text', replyToId?: string): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) return false;

    try {
        const takeData = {
            debateId,
            authorAnonId: user.anonId,
            authorAvatarColor: user.avatarColor,
            text,
            type,
            upvotes: 0,
            downvotes: 0,
            replyCount: 0,
            createdAt: serverTimestamp(),
            // Basic moderation check (client side is weak but better than nothing)
            isFlagged: false,
            replyToId: replyToId || null
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES), takeData);

        // Update total takes count
        const debateRef = doc(db, COLLECTIONS.DEBATES, debateId);
        await updateDoc(debateRef, { totalTakes: increment(1) });

        return true;
    } catch (e) {
        console.error('Error posting take', e);
        return false;
    }
};

/**
 * Get takes for a debate
 */
export const getDebateTakes = async (debateId: string): Promise<DebateTake[]> => {
    try {
        const q = query(
            collection(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES),
            orderBy('upvotes', 'desc'), // Default sort: Top
            limit(50)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
        } as DebateTake));
    } catch (e) {
        console.error('Error fetching takes', e);
        return [];
    }
};

/**
 * Admin: Create a new debate
 * This deactivates previous debates for that college
 */
export const createDebate = async (topic: string, college: string): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) return false; // In UI we verify email too

    try {
        // Deactivate old debates
        const q = query(
            collection(db, COLLECTIONS.DEBATES),
            where('college', '==', college),
            where('isActive', '==', true)
        );
        const snap = await getDocs(q);
        snap.forEach(async (d) => {
            await updateDoc(doc(db, COLLECTIONS.DEBATES, d.id), { isActive: false });
        });

        // Create new debate
        await addDoc(collection(db, COLLECTIONS.DEBATES), {
            topic,
            college,
            createdBy: user.userId,
            isActive: true,
            createdAt: serverTimestamp(),
            endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
            stats: { agree: 0, neutral: 0, disagree: 0, total: 0 },
            totalTakes: 0
        });

        return true;
    } catch (e) {
        console.error('Error creating debate', e);
        return false;
    }
};

/**
 * Vote on a Take (Up/Down)
 */
export const voteOnTake = async (debateId: string, takeId: string, type: 'up' | 'down'): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) return false;

    const voteRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES, takeId, COLLECTIONS.VOTES, user.userId);
    const takeRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES, takeId);

    try {
        const voteDoc = await getDoc(voteRef);
        if (voteDoc.exists()) {
            const oldType = voteDoc.data().type;

            if (oldType === type) {
                // Remove vote (toggle off)
                await setDoc(voteRef, { type: null });
                await updateDoc(takeRef, {
                    [oldType === 'up' ? 'upvotes' : 'downvotes']: increment(-1)
                });
            } else if (oldType) {
                // Switch vote (e.g. up -> down)
                await updateDoc(voteRef, { type });
                await updateDoc(takeRef, {
                    [oldType === 'up' ? 'upvotes' : 'downvotes']: increment(-1),
                    [type === 'up' ? 'upvotes' : 'downvotes']: increment(1)
                });
            } else {
                // Voted previously but type was null (re-voting)
                await updateDoc(voteRef, { type });
                await updateDoc(takeRef, {
                    [type === 'up' ? 'upvotes' : 'downvotes']: increment(1)
                });
            }
        } else {
            // New vote
            await setDoc(voteRef, { type, userId: user.userId });
            await updateDoc(takeRef, {
                [type === 'up' ? 'upvotes' : 'downvotes']: increment(1)
            });
        }
        return true;
    } catch (e) {
        console.error('Error voting on take', e);
        return false;
    }
};
