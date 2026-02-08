import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    setDoc,
    onSnapshot,
    Unsubscribe
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

// ============================================================================
// DEBATE FETCHING
// ============================================================================

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
export const subscribeToDebate = (debateId: string, callback: (debate: Debate) => void): Unsubscribe => {
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

// ============================================================================
// DEBATE VOTING (Opinion Poll)
// ============================================================================

/**
 * Get user's current vote on the debate
 */
export const getUserDebateVote = async (debateId: string): Promise<VoteType | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    try {
        const voteRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.OPINION_VOTES, user.userId);
        const voteDoc = await getDoc(voteRef);

        if (voteDoc.exists()) {
            return voteDoc.data().type as VoteType;
        }
        return null;
    } catch (e) {
        console.error('Error fetching user debate vote', e);
        return null;
    }
};

/**
 * Vote on the main debate topic (Agree/Neutral/Disagree)
 * Triggers milestone notifications at 50, 100, 250, 500, 1000 votes
 */
export const voteOnDebate = async (debateId: string, voteType: VoteType): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) return false;

    const voteRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.OPINION_VOTES, user.userId);
    const debateRef = doc(db, COLLECTIONS.DEBATES, debateId);

    try {
        const [voteDoc, debateDoc] = await Promise.all([
            getDoc(voteRef),
            getDoc(debateRef)
        ]);

        const debateData = debateDoc.data();
        const currentTotal = debateData?.stats?.total || 0;
        let isNewVote = false;

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
            isNewVote = true;
            await setDoc(voteRef, { type: voteType, userId: user.userId, createdAt: serverTimestamp() });
            await updateDoc(debateRef, {
                [`stats.${voteType}`]: increment(1),
                [`stats.total`]: increment(1)
            });
        }

        // Check for vote milestones and send notifications
        if (isNewVote && debateData) {
            const newTotal = currentTotal + 1;
            const milestones = [50, 100, 250, 500, 1000];

            if (milestones.includes(newTotal)) {
                try {
                    await addDoc(collection(db, 'notification_queue'), {
                        type: 'vote_milestone',
                        title: `🎯 ${newTotal} Votes Reached!`,
                        body: `The battle "${debateData.topic?.substring(0, 30)}..." is heating up! Join the war now.`,
                        debateId,
                        topic: debateData.topic,
                        college: debateData.college,
                        targetUsers: 'all',
                        status: 'pending',
                        createdAt: serverTimestamp(),
                        data: {
                            click_action: 'OPEN_DEBATE',
                            debateId,
                            milestone: newTotal.toString()
                        }
                    });
                    console.log(`📬 Vote milestone ${newTotal} notification queued`);
                } catch (e) {
                    console.warn('Failed to queue milestone notification:', e);
                }
            }
        }

        return true;
    } catch (e) {
        console.error('Error voting on debate', e);
        return false;
    }
};

// ============================================================================
// TAKES (Comments/Messages)
// ============================================================================

/**
 * Post a take (opinion)
 */
export const postDebateTake = async (
    debateId: string,
    text: string,
    type: 'text' | 'emoji' | 'gif' | 'sticker' = 'text',
    replyToId?: string
): Promise<string | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    try {
        const takeData = {
            debateId,
            authorUserId: user.userId,
            authorAnonId: user.anonId,
            authorDisplayName: user.displayName || user.anonId,
            authorAvatarColor: user.avatarColor,
            authorAvatarUrl: user.avatarUrl || null,
            text,
            type,
            upvotes: 0,
            downvotes: 0,
            replyCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isEdited: false,
            isDeleted: false,
            isFlagged: false,
            replyToId: replyToId || null
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES), takeData);

        // Update total takes count
        const debateRef = doc(db, COLLECTIONS.DEBATES, debateId);
        await updateDoc(debateRef, { totalTakes: increment(1) });

        // If this is a reply, increment reply count on parent
        if (replyToId) {
            const parentRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES, replyToId);
            await updateDoc(parentRef, { replyCount: increment(1) });
        }

        return docRef.id;
    } catch (e) {
        console.error('Error posting take', e);
        return null;
    }
};

/**
 * Edit a take
 */
export const editDebateTake = async (debateId: string, takeId: string, newText: string): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) return false;

    try {
        const takeRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES, takeId);
        const takeDoc = await getDoc(takeRef);

        if (!takeDoc.exists()) return false;

        // Verify ownership
        if (takeDoc.data().authorUserId !== user.userId) {
            console.error('Cannot edit: Not the author');
            return false;
        }

        await updateDoc(takeRef, {
            text: newText,
            isEdited: true,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (e) {
        console.error('Error editing take', e);
        return false;
    }
};

/**
 * Delete a take
 */
export const deleteDebateTake = async (debateId: string, takeId: string): Promise<boolean> => {
    const user = await getCurrentUser();
    if (!user) return false;

    try {
        const takeRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES, takeId);
        const takeDoc = await getDoc(takeRef);

        if (!takeDoc.exists()) return false;

        // Verify ownership
        if (takeDoc.data().authorUserId !== user.userId) {
            console.error('Cannot delete: Not the author');
            return false;
        }

        // Soft delete - mark as deleted
        await updateDoc(takeRef, {
            isDeleted: true,
            text: '[Deleted]',
            updatedAt: serverTimestamp()
        });

        // Update total takes count
        const debateRef = doc(db, COLLECTIONS.DEBATES, debateId);
        await updateDoc(debateRef, { totalTakes: increment(-1) });

        return true;
    } catch (e) {
        console.error('Error deleting take', e);
        return false;
    }
};

/**
 * Get takes for a debate with user vote status
 */
export const getDebateTakes = async (debateId: string): Promise<DebateTake[]> => {
    const user = await getCurrentUser();

    try {
        const q = query(
            collection(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES),
            where('isDeleted', '==', false),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
        const snapshot = await getDocs(q);

        const takes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date()
        } as DebateTake & { authorUserId?: string; authorDisplayName?: string; authorAvatarUrl?: string; isEdited?: boolean }));

        // Fetch user's votes on these takes
        if (user) {
            const votesPromises = takes.map(async (take) => {
                try {
                    const voteRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES, take.id, COLLECTIONS.VOTES, user.userId);
                    const voteDoc = await getDoc(voteRef);
                    if (voteDoc.exists()) {
                        take.userVote = voteDoc.data().type as 'up' | 'down' | null;
                    }
                } catch (e) {
                    // Silently fail for individual vote fetches
                }
                return take;
            });
            await Promise.all(votesPromises);
        }

        return takes;
    } catch (e) {
        console.error('Error fetching takes', e);
        return [];
    }
};

/**
 * Subscribe to takes in real-time
 */
export const subscribeToTakes = (
    debateId: string,
    callback: (takes: DebateTake[]) => void
): Unsubscribe => {
    const q = query(
        collection(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES),
        orderBy('createdAt', 'desc'),
        limit(100)
    );

    return onSnapshot(q, async (snapshot) => {
        const takes = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date()
            } as DebateTake & { isDeleted?: boolean }))
            .filter(take => !take.isDeleted);

        callback(takes);
    });
};

// ============================================================================
// TAKE VOTING
// ============================================================================

/**
 * Vote on a Take (Up/Down) - with toggle support
 */
export const voteOnTake = async (debateId: string, takeId: string, type: 'up' | 'down'): Promise<'added' | 'removed' | 'switched' | false> => {
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
                await updateDoc(voteRef, { type: null, updatedAt: serverTimestamp() });
                await updateDoc(takeRef, {
                    [type === 'up' ? 'upvotes' : 'downvotes']: increment(-1)
                });
                return 'removed';
            } else if (oldType) {
                // Switch vote (e.g. up -> down)
                await updateDoc(voteRef, { type, updatedAt: serverTimestamp() });
                await updateDoc(takeRef, {
                    [oldType === 'up' ? 'upvotes' : 'downvotes']: increment(-1),
                    [type === 'up' ? 'upvotes' : 'downvotes']: increment(1)
                });
                return 'switched';
            } else {
                // Voted previously but type was null (re-voting)
                await updateDoc(voteRef, { type, updatedAt: serverTimestamp() });
                await updateDoc(takeRef, {
                    [type === 'up' ? 'upvotes' : 'downvotes']: increment(1)
                });
                return 'added';
            }
        } else {
            // New vote
            await setDoc(voteRef, { type, userId: user.userId, createdAt: serverTimestamp() });
            await updateDoc(takeRef, {
                [type === 'up' ? 'upvotes' : 'downvotes']: increment(1)
            });
            return 'added';
        }
    } catch (e) {
        console.error('Error voting on take', e);
        return false;
    }
};

/**
 * Get user's votes on all takes in a debate
 */
export const getUserTakeVotes = async (debateId: string, takeIds: string[]): Promise<Map<string, 'up' | 'down' | null>> => {
    const user = await getCurrentUser();
    const votes = new Map<string, 'up' | 'down' | null>();

    if (!user || takeIds.length === 0) return votes;

    try {
        const promises = takeIds.map(async (takeId) => {
            const voteRef = doc(db, COLLECTIONS.DEBATES, debateId, COLLECTIONS.TAKES, takeId, COLLECTIONS.VOTES, user.userId);
            const voteDoc = await getDoc(voteRef);
            if (voteDoc.exists() && voteDoc.data().type) {
                votes.set(takeId, voteDoc.data().type as 'up' | 'down');
            }
        });
        await Promise.all(promises);
    } catch (e) {
        console.error('Error fetching user take votes', e);
    }

    return votes;
};

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Admin: Create a new debate
 * This deactivates previous debates for that college
 * Sends push notification to ALL college students
 */
export const createDebate = async (topic: string, college: string): Promise<string | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    try {
        // Deactivate old debates
        const q = query(
            collection(db, COLLECTIONS.DEBATES),
            where('college', '==', college),
            where('isActive', '==', true)
        );
        const snap = await getDocs(q);
        const deactivatePromises = snap.docs.map(d =>
            updateDoc(doc(db, COLLECTIONS.DEBATES, d.id), { isActive: false })
        );
        await Promise.all(deactivatePromises);

        // Create new debate
        const debateRef = await addDoc(collection(db, COLLECTIONS.DEBATES), {
            topic,
            college,
            createdBy: user.userId,
            isActive: true,
            createdAt: serverTimestamp(),
            endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
            stats: { agree: 0, neutral: 0, disagree: 0, total: 0 },
            totalTakes: 0
        });

        // Queue notification to all college students
        try {
            await addDoc(collection(db, 'notification_queue'), {
                type: 'new_debate',
                title: '⚔️ New Battle Started!',
                body: `🔥 "${topic.substring(0, 50)}${topic.length > 50 ? '...' : ''}" - Jump in and share your hot take!`,
                debateId: debateRef.id,
                topic,
                college,
                targetUsers: 'all',
                status: 'pending',
                createdAt: serverTimestamp(),
                data: {
                    click_action: 'OPEN_DEBATE',
                    debateId: debateRef.id,
                    sound: 'battle_start'
                }
            });
            console.log('📬 Debate notification queued for college:', college);
        } catch (notifError) {
            console.warn('Failed to queue notification, debate still created:', notifError);
        }

        return debateRef.id;
    } catch (e) {
        console.error('Error creating debate', e);
        return null;
    }
};

/**
 * Admin: End/Deactivate a debate
 */
export const endDebate = async (debateId: string): Promise<boolean> => {
    try {
        const debateRef = doc(db, COLLECTIONS.DEBATES, debateId);
        await updateDoc(debateRef, {
            isActive: false,
            endedAt: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error('Error ending debate', e);
        return false;
    }
};
