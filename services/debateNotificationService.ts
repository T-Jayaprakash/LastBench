/**
 * ============================================================================
 * DEBATE NOTIFICATION SERVICE
 * ============================================================================
 * 
 * Handles sending push notifications to engage college students in debates.
 * Triggers notifications for:
 * - New debate topics (to all college students)
 * - Hot takes (trending messages)
 * - Vote milestones
 * - Debate ending soon
 * 
 * ============================================================================
 */

import { db } from './firebase';
import {
    collection,
    getDocs,
    query,
    where,
    addDoc,
    serverTimestamp,
    doc,
    getDoc
} from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

interface DebateNotification {
    type: 'new_debate' | 'hot_take' | 'vote_milestone' | 'debate_ending' | 'debate_result';
    title: string;
    body: string;
    debateId: string;
    topic?: string;
    college: string;
    targetUsers: 'all' | 'voters' | 'participants';
    data?: Record<string, string>;
}

// ============================================================================
// NOTIFICATION QUEUE (Firebase Firestore)
// ============================================================================

/**
 * Queue a notification to be sent to users
 * Backend/Cloud Function will process this queue and send FCM notifications
 */
export const queueDebateNotification = async (notification: DebateNotification): Promise<boolean> => {
    try {
        await addDoc(collection(db, 'notification_queue'), {
            ...notification,
            status: 'pending',
            createdAt: serverTimestamp(),
            processedAt: null,
            sentCount: 0,
            failedCount: 0
        });
        console.log('📬 Debate notification queued:', notification.type);
        return true;
    } catch (error) {
        console.error('Failed to queue notification:', error);
        return false;
    }
};

// ============================================================================
// NOTIFICATION TRIGGERS
// ============================================================================

/**
 * Notify all college students about a new debate
 * Called when admin creates a new battle topic
 */
export const notifyNewDebate = async (debateId: string, topic: string, college: string): Promise<void> => {
    await queueDebateNotification({
        type: 'new_debate',
        title: '⚔️ New Battle Started!',
        body: `🔥 "${topic.substring(0, 50)}${topic.length > 50 ? '...' : ''}" - Jump in and share your hot take!`,
        debateId,
        topic,
        college,
        targetUsers: 'all',
        data: {
            click_action: 'OPEN_DEBATE',
            debateId,
            sound: 'battle_start'
        }
    });
};

/**
 * Notify when a take is getting lots of engagement
 */
export const notifyHotTake = async (
    debateId: string,
    takeId: string,
    takeText: string,
    authorName: string,
    college: string,
    voteCount: number
): Promise<void> => {
    if (voteCount < 5) return; // Only notify after 5+ votes

    await queueDebateNotification({
        type: 'hot_take',
        title: '🔥 Hot Take Alert!',
        body: `${authorName}: "${takeText.substring(0, 40)}..." is on fire with ${voteCount} votes!`,
        debateId,
        college,
        targetUsers: 'all',
        data: {
            click_action: 'OPEN_TAKE',
            debateId,
            takeId
        }
    });
};

/**
 * Notify at vote milestones (50, 100, 500, 1000 votes)
 */
export const notifyVoteMilestone = async (
    debateId: string,
    topic: string,
    college: string,
    totalVotes: number
): Promise<void> => {
    const milestones = [50, 100, 250, 500, 1000];

    if (!milestones.includes(totalVotes)) return;

    await queueDebateNotification({
        type: 'vote_milestone',
        title: `🎯 ${totalVotes} Votes Reached!`,
        body: `The battle "${topic.substring(0, 30)}..." is heating up! Join the war now.`,
        debateId,
        topic,
        college,
        targetUsers: 'all',
        data: {
            click_action: 'OPEN_DEBATE',
            debateId,
            milestone: totalVotes.toString()
        }
    });
};

/**
 * Notify when debate is ending soon (1 hour left)
 */
export const notifyDebateEndingSoon = async (
    debateId: string,
    topic: string,
    college: string,
    agreePercent: number,
    disagreePercent: number
): Promise<void> => {
    const leading = agreePercent > disagreePercent ? '👍 Agree' : '👎 Disagree';
    const leadPercent = Math.max(agreePercent, disagreePercent);

    await queueDebateNotification({
        type: 'debate_ending',
        title: '⏰ Battle Ending Soon!',
        body: `${leading} is winning at ${leadPercent}%! Last chance to change the outcome.`,
        debateId,
        topic,
        college,
        targetUsers: 'all',
        data: {
            click_action: 'OPEN_DEBATE',
            debateId,
            urgency: 'high'
        }
    });
};

/**
 * Notify final results when debate ends
 */
export const notifyDebateResult = async (
    debateId: string,
    topic: string,
    college: string,
    agreePercent: number,
    disagreePercent: number,
    totalVotes: number
): Promise<void> => {
    const winner = agreePercent > disagreePercent ? '👍 AGREE' : '👎 DISAGREE';
    const winPercent = Math.max(agreePercent, disagreePercent);

    await queueDebateNotification({
        type: 'debate_result',
        title: '🏆 Battle Concluded!',
        body: `${winner} won with ${winPercent}%! ${totalVotes} warriors participated.`,
        debateId,
        topic,
        college,
        targetUsers: 'participants',
        data: {
            click_action: 'OPEN_DEBATE',
            debateId,
            result: winner
        }
    });
};

// ============================================================================
// ENGAGEMENT NOTIFICATIONS (Time-based)
// ============================================================================

/**
 * Get users who haven't participated in today's debate
 */
export const getInactiveDebateUsers = async (college: string, debateId: string): Promise<string[]> => {
    try {
        // Get all active users from the college
        const usersQuery = query(
            collection(db, 'users'),
            where('college', '==', college),
            where('isActive', '==', true)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const allUserIds = usersSnapshot.docs.map(doc => doc.id);

        // Get users who have voted
        const votesQuery = query(
            collection(db, 'debates', debateId, 'opinion_votes')
        );
        const votesSnapshot = await getDocs(votesQuery);
        const votedUserIds = new Set(votesSnapshot.docs.map(doc => doc.id));

        // Get users who have posted takes
        const takesQuery = query(
            collection(db, 'debates', debateId, 'takes')
        );
        const takesSnapshot = await getDocs(takesQuery);
        const participatedUserIds = new Set(takesSnapshot.docs.map(doc => doc.data().authorUserId));

        // Find inactive users
        const inactiveUsers = allUserIds.filter(
            userId => !votedUserIds.has(userId) && !participatedUserIds.has(userId)
        );

        return inactiveUsers;
    } catch (error) {
        console.error('Error getting inactive users:', error);
        return [];
    }
};

/**
 * Send reminder to users who haven't participated
 */
export const sendEngagementReminder = async (
    debateId: string,
    topic: string,
    college: string,
    currentVotes: number,
    currentTakes: number
): Promise<void> => {
    await queueDebateNotification({
        type: 'new_debate',
        title: '🔔 Battle Update!',
        body: `${currentVotes} votes, ${currentTakes} warriors fighting! Join the debate: "${topic.substring(0, 30)}..."`,
        debateId,
        topic,
        college,
        targetUsers: 'all',
        data: {
            click_action: 'OPEN_DEBATE',
            debateId,
            reminderType: 'engagement'
        }
    });
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
    notifyNewDebate,
    notifyHotTake,
    notifyVoteMilestone,
    notifyDebateEndingSoon,
    notifyDebateResult,
    sendEngagementReminder,
    getInactiveDebateUsers
};
