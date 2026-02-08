import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Debate, DebateTake, VoteType } from '../types';
import * as debateService from '../services/debateService';
import { getAuth } from 'firebase/auth';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface DebateViewProps {
    user: User | null;
    isActive?: boolean;
}

// SVG Icons
const SwordsIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M6.92893 5.51472L5.51472 6.92893L7.34315 8.75736L6.63604 9.46447L4.80761 7.63604L3.3934 9.05025L5.22183 10.8787L4.51472 11.5858L2.68629 9.75736L1.27208 11.1716L6.92893 16.8284L8.34315 15.4142L6.51472 13.5858L7.22183 12.8787L9.05025 14.7071L10.4645 13.293L8.63604 11.4645L9.34315 10.7574L11.1716 12.5858L12.5858 11.1716L6.92893 5.51472ZM17.0711 18.4853L18.4853 17.0711L16.6569 15.2426L17.364 14.5355L19.1924 16.364L20.6066 14.9497L18.7782 13.1213L19.4853 12.4142L21.3137 14.2426L22.7279 12.8284L17.0711 7.17157L15.6569 8.58579L17.4853 10.4142L16.7782 11.1213L14.9497 9.29289L13.5355 10.7071L15.364 12.5355L14.6569 13.2426L12.8284 11.4142L11.4142 12.8284L17.0711 18.4853Z" />
    </svg>
);

const FireIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 23C16.1421 23 19.5 19.6421 19.5 15.5C19.5 14.1277 19.0882 12.8561 18.3867 11.7913C17.532 10.9997 16.7844 10.1019 16.1567 9.1176C16.0233 8.90956 15.8947 8.70012 15.7711 8.48946C14.8242 6.91675 14.25 5.14286 14.25 3C14.25 3 13.5765 4.5 11.625 6C9.67351 7.5 8.25 9 8.25 11.25C8.25 11.6642 8.21358 12.0691 8.14447 12.4616C7.54221 11.9065 7.125 11.1597 7.125 10.3125C7.125 10.3125 5.25 12 5.25 14.625C5.25 19.0063 8.36874 23 12 23Z" />
    </svg>
);

const HeartIcon = ({ className, filled }: { className?: string; filled?: boolean }) => (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
);

const MessageIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
);

const MoreIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="19" r="2" />
    </svg>
);

const EditIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const ChartIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

// Extended type for takes with additional author info
interface ExtendedTake extends DebateTake {
    authorUserId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
    isEdited?: boolean;
}

const DebateView: React.FC<DebateViewProps> = ({ user, isActive = false }) => {
    const [debate, setDebate] = useState<Debate | null>(null);
    const [takes, setTakes] = useState<ExtendedTake[]>([]);
    const [newTake, setNewTake] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [creatingTopic, setCreatingTopic] = useState('');
    const [adminCollege, setAdminCollege] = useState('');
    const [myVote, setMyVote] = useState<VoteType | null>(null);
    const [replyingTo, setReplyingTo] = useState<ExtendedTake | null>(null);
    const [userTakeVotes, setUserTakeVotes] = useState<Map<string, 'up' | 'down' | null>>(new Map());
    const [animatingVote, setAnimatingVote] = useState<string | null>(null);
    const [editingTake, setEditingTake] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [showMenuFor, setShowMenuFor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<string>('24:00:00');
    const [showTopicPoll, setShowTopicPoll] = useState(false);
    const [suggestedTopics, setSuggestedTopics] = useState<{ id: string; topic: string; votes: number; isUserSuggested?: boolean }[]>([]);
    const [newTopicSuggestion, setNewTopicSuggestion] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const auth = getAuth();

    // Admin Check
    useEffect(() => {
        const email = auth.currentUser?.email;
        if (email?.toLowerCase() === 'jayaprakash.5388@gmail.com') {
            setIsAdmin(true);
        }
    }, [auth.currentUser]);

    // Close modals when navigating away from this tab
    useEffect(() => {
        if (!isActive) {
            setShowTopicPoll(false);
            setShowMenuFor(null);
            setReplyingTo(null);
            setEditingTake(null);
        }
    }, [isActive]);

    // Fetch Debate and Subscribe to Updates
    useEffect(() => {
        if (!user?.college) return;

        let unsubDebate: (() => void) | null = null;
        let unsubTakes: (() => void) | null = null;

        const initDebate = async () => {
            setIsLoading(true);
            const active = await debateService.getActiveDebate(user.college!);

            if (active) {
                setDebate(active);

                // Get user's vote on the debate
                const userVote = await debateService.getUserDebateVote(active.id);
                setMyVote(userVote);

                // Subscribe to debate updates (vote counts)
                unsubDebate = debateService.subscribeToDebate(active.id, (updated) => {
                    setDebate(updated);
                });

                // Subscribe to takes in real-time
                unsubTakes = debateService.subscribeToTakes(active.id, async (fetchedTakes) => {
                    setTakes(fetchedTakes);

                    // Fetch user votes for these takes
                    if (fetchedTakes.length > 0) {
                        const takeIds = fetchedTakes.map(t => t.id);
                        const votes = await debateService.getUserTakeVotes(active.id, takeIds);
                        setUserTakeVotes(votes);
                    }
                });
            } else {
                setDebate(null);
            }
            setIsLoading(false);
        };

        initDebate();

        return () => {
            if (unsubDebate) unsubDebate();
            if (unsubTakes) unsubTakes();
        };
    }, [user?.college]);

    // 24-hour Countdown Timer
    useEffect(() => {
        if (!debate?.endsAt) return;

        const updateTimer = () => {
            const now = new Date();
            const endTime = debate.endsAt instanceof Date ? debate.endsAt : new Date(debate.endsAt);
            const diff = endTime.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining('00:00:00');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [debate?.endsAt]);

    // Load Default Suggested Topics
    useEffect(() => {
        // Hot topics that spark college debates
        const defaultTopics = [
            { id: '1', topic: "Morning classes should be banned 😴", votes: 45, isUserSuggested: false },
            { id: '2', topic: "Online exams are easier than offline 💻", votes: 38, isUserSuggested: false },
            { id: '3', topic: "Hostellers have more fun than day scholars 🏠", votes: 52, isUserSuggested: false },
            { id: '4', topic: "Attendance should not be mandatory 📋", votes: 67, isUserSuggested: false },
            { id: '5', topic: "Lab sessions are waste of time 🔬", votes: 29, isUserSuggested: false },
            { id: '6', topic: "CSE students think they're superior 💻", votes: 41, isUserSuggested: false },
            { id: '7', topic: "Canteen food is overpriced 🍔", votes: 55, isUserSuggested: false },
            { id: '8', topic: "Internships matter more than CGPA 💼", votes: 48, isUserSuggested: false },
        ];
        setSuggestedTopics(defaultTopics);
    }, []);

    // Auto-resize Composer
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [newTake]);

    // Haptic feedback
    const triggerHaptic = useCallback(() => {
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
    }, []);

    // Vote on debate topic
    const handleVoteDebate = async (type: VoteType) => {
        if (!debate) return;
        triggerHaptic();
        setAnimatingVote(type);
        setTimeout(() => setAnimatingVote(null), 300);

        const previousVote = myVote;
        setMyVote(type); // Optimistic update

        const success = await debateService.voteOnDebate(debate.id, type);
        if (!success) {
            setMyVote(previousVote); // Revert on failure
        }
    };

    // Post a new take
    const handlePostTake = async () => {
        if (!newTake.trim() || !user || !debate) return;
        setIsPosting(true);
        triggerHaptic();

        const takeId = await debateService.postDebateTake(debate.id, newTake, 'text', replyingTo?.id);

        if (takeId) {
            // Add optimistic take (will be replaced by real-time subscription)
            const tempTake: ExtendedTake = {
                id: takeId,
                debateId: debate.id,
                authorUserId: user.userId,
                authorAnonId: user.anonId,
                authorDisplayName: user.displayName || user.anonId,
                authorAvatarColor: user.avatarColor,
                authorAvatarUrl: user.avatarUrl,
                text: newTake,
                type: 'text',
                upvotes: 0,
                downvotes: 0,
                replyCount: 0,
                createdAt: new Date(),
                // @ts-ignore
                replyToId: replyingTo?.id || null
            };
            setTakes(prev => [tempTake, ...prev]);
            setNewTake('');
            setReplyingTo(null);
        }
        setIsPosting(false);
    };

    // Vote on a take (like/dislike)
    const handleTakeVote = async (takeId: string, type: 'up' | 'down') => {
        if (!debate) return;
        triggerHaptic();

        // Optimistic update
        const currentVote = userTakeVotes.get(takeId);
        const newVotes = new Map(userTakeVotes);

        let upvoteDelta = 0;
        let downvoteDelta = 0;

        if (currentVote === type) {
            // Removing vote
            newVotes.delete(takeId);
            if (type === 'up') upvoteDelta = -1;
            else downvoteDelta = -1;
        } else if (currentVote) {
            // Switching vote
            newVotes.set(takeId, type);
            if (type === 'up') { upvoteDelta = 1; downvoteDelta = -1; }
            else { upvoteDelta = -1; downvoteDelta = 1; }
        } else {
            // New vote
            newVotes.set(takeId, type);
            if (type === 'up') upvoteDelta = 1;
            else downvoteDelta = 1;
        }

        setUserTakeVotes(newVotes);
        setTakes(prev => prev.map(t => {
            if (t.id === takeId) {
                return {
                    ...t,
                    upvotes: t.upvotes + upvoteDelta,
                    downvotes: t.downvotes + downvoteDelta
                };
            }
            return t;
        }));

        await debateService.voteOnTake(debate.id, takeId, type);
    };

    // Edit a take
    const handleEditTake = async (takeId: string) => {
        if (!debate || !editText.trim()) return;
        triggerHaptic();

        const success = await debateService.editDebateTake(debate.id, takeId, editText);
        if (success) {
            setTakes(prev => prev.map(t => {
                if (t.id === takeId) {
                    return { ...t, text: editText, isEdited: true };
                }
                return t;
            }));
        }
        setEditingTake(null);
        setEditText('');
    };

    // Delete a take
    const handleDeleteTake = async (takeId: string) => {
        if (!debate) return;
        triggerHaptic();

        const success = await debateService.deleteDebateTake(debate.id, takeId);
        if (success) {
            setTakes(prev => prev.filter(t => t.id !== takeId));
        }
        setShowMenuFor(null);
    };

    // Create debate (admin)
    const handleCreateDebate = async () => {
        if (!creatingTopic.trim()) return;
        const targetCollege = adminCollege || user?.college || '';
        if (!targetCollege) { alert("No college target"); return; }
        await debateService.createDebate(creatingTopic, targetCollege);
        setCreatingTopic('');
        window.location.reload();
    };

    // Calculate stats
    const totalVotes = debate ? (debate.stats?.agree || 0) + (debate.stats?.neutral || 0) + (debate.stats?.disagree || 0) : 0;
    const agreePercent = totalVotes > 0 ? Math.round(((debate?.stats?.agree || 0) / totalVotes) * 100) : 0;
    const disagreePercent = totalVotes > 0 ? Math.round(((debate?.stats?.disagree || 0) / totalVotes) * 100) : 0;

    if (!user) return null;

    return (
        <div className="flex flex-col h-full bg-[#0d0000] text-white font-sans relative overflow-hidden">
            {/* Intense War Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Deep crimson gradient from top */}
                <div className="absolute top-0 left-0 w-full h-60 bg-gradient-to-b from-red-950/60 via-red-900/30 to-transparent" />
                {/* Fiery ember glow - left */}
                <div className="absolute top-10 -left-20 w-80 h-80 bg-gradient-radial from-red-600/30 via-orange-600/15 to-transparent rounded-full blur-3xl animate-pulse" />
                {/* Intense fire glow - right */}
                <div className="absolute top-32 -right-10 w-72 h-72 bg-gradient-radial from-orange-500/25 via-red-500/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                {/* Bottom ember */}
                <div className="absolute bottom-40 left-1/3 w-96 h-40 bg-gradient-to-t from-red-900/20 via-orange-900/10 to-transparent blur-2xl" />
                {/* Sparks effect */}
                <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-orange-400 rounded-full blur-sm animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 bg-red-400 rounded-full blur-sm animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
            </div>

            {/* ========== STICKY HEADER + TOPIC ========== */}
            <div className="flex-shrink-0 sticky top-0 z-40">
                {/* Header with fiery glow */}
                <div className="backdrop-blur-xl bg-gradient-to-r from-black/90 via-red-950/20 to-black/90 border-b border-red-900/30">
                    <div className="px-4 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/50 animate-pulse" style={{ animationDuration: '3s' }}>
                                <SwordsIcon className="w-5 h-5 text-white drop-shadow-lg" />
                            </div>
                            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">Battle Arena</h1>
                        </div>
                        {debate && (
                            <div className="flex items-center gap-2">
                                {/* 24-Hour Countdown Timer */}
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${timeRemaining.startsWith('00:')
                                    ? 'bg-red-600/30 border-red-500/60 shadow-lg shadow-red-500/30'
                                    : 'bg-black/50 border-white/20'
                                    }`}>
                                    <ClockIcon className={`w-3.5 h-3.5 ${timeRemaining.startsWith('00:') ? 'text-red-400' : 'text-orange-400'}`} />
                                    <span className={`text-xs font-mono font-bold tracking-wider ${timeRemaining.startsWith('00:') ? 'text-red-400' : 'text-white'
                                        }`}>
                                        {timeRemaining}
                                    </span>
                                </div>
                                {/* Topic Poll Button */}
                                <button
                                    onClick={() => setShowTopicPoll(true)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-600/30 border border-orange-500/50 hover:bg-orange-500/40 transition-all"
                                >
                                    <ChartIcon className="w-3.5 h-3.5 text-orange-400" />
                                    <span className="text-[10px] font-bold text-orange-400">POLL</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Admin Panel */}
                {isAdmin && !debate && (
                    <div className="p-4 bg-black/90 border-b border-white/10 space-y-3">
                        <h3 className="font-bold text-sm text-gray-400">Launch Topic</h3>
                        <input
                            className="w-full bg-white/5 p-3 rounded-xl text-sm border border-white/10 focus:border-red-500/50 outline-none"
                            placeholder="College Name"
                            value={adminCollege} onChange={e => setAdminCollege(e.target.value)}
                        />
                        <textarea
                            className="w-full bg-white/5 p-3 rounded-xl text-sm border border-white/10 focus:border-red-500/50 outline-none"
                            placeholder="Topic..."
                            rows={2}
                            value={creatingTopic} onChange={e => setCreatingTopic(e.target.value)}
                        />
                        <button onClick={handleCreateDebate} className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold py-3 rounded-xl text-sm shadow-lg">
                            ⚔️ Start Battle
                        </button>
                    </div>
                )}

                {/* STICKY TOPIC CARD - Battle Zone */}
                {debate && (
                    <div className="bg-gradient-to-b from-red-950/40 via-black/95 to-black/90 backdrop-blur-xl border-b border-red-900/40 px-4 py-4">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/40 animate-pulse" style={{ animationDuration: '2s' }}>
                                <FireIcon className="w-6 h-6 text-white drop-shadow-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">⚔️ TODAY'S BATTLE</span>
                                <h2 className="text-base font-bold leading-snug text-white line-clamp-2 mt-0.5">{debate.topic}</h2>
                            </div>
                        </div>

                        {/* Vote Bar */}
                        <div className="flex items-center gap-2">
                            {/* AGREE Button - Green Team */}
                            <button
                                onClick={() => handleVoteDebate('agree')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all duration-300 ${myVote === 'agree'
                                    ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 shadow-xl shadow-green-500/40 ring-2 ring-green-400/60 scale-[1.02]'
                                    : 'bg-green-950/40 border border-green-800/40 hover:bg-green-900/50 hover:border-green-600/50 active:scale-95'
                                    } ${animatingVote === 'agree' ? 'scale-95' : ''}`}
                            >
                                <span className="text-2xl">👍</span>
                                <div className="flex flex-col items-start">
                                    <span className={`text-base font-black ${myVote === 'agree' ? 'text-white' : 'text-green-400'}`}>{agreePercent}%</span>
                                    <span className={`text-[9px] font-bold ${myVote === 'agree' ? 'text-white/80' : 'text-green-600'}`}>AGREE</span>
                                </div>
                            </button>

                            {/* VS Badge */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/50 ring-2 ring-orange-400/30">
                                <span className="text-xs font-black text-white drop-shadow-lg">VS</span>
                            </div>

                            {/* DISAGREE Button - Red Team */}
                            <button
                                onClick={() => handleVoteDebate('disagree')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all duration-300 ${myVote === 'disagree'
                                    ? 'bg-gradient-to-br from-red-600 via-red-500 to-red-700 shadow-xl shadow-red-600/50 ring-2 ring-red-500/70 scale-[1.02]'
                                    : 'bg-red-950/40 border border-red-800/40 hover:bg-red-900/50 hover:border-red-600/50 active:scale-95'
                                    } ${animatingVote === 'disagree' ? 'scale-95' : ''}`}
                            >
                                <span className="text-2xl">👎</span>
                                <div className="flex flex-col items-start">
                                    <span className={`text-base font-black ${myVote === 'disagree' ? 'text-white' : 'text-red-400'}`}>{disagreePercent}%</span>
                                    <span className={`text-[9px] font-bold ${myVote === 'disagree' ? 'text-white/80' : 'text-red-600'}`}>DISAGREE</span>
                                </div>
                            </button>
                        </div>

                        {/* Vote Progress Bar */}
                        {totalVotes > 0 && (
                            <div className="mt-3 h-2 rounded-full overflow-hidden bg-black/50 flex border border-white/10">
                                <div className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 transition-all duration-500 shadow-lg shadow-green-500/30" style={{ width: `${agreePercent}%` }} />
                                <div className="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 transition-all duration-500 shadow-lg shadow-red-600/30" style={{ width: `${disagreePercent}%` }} />
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] text-orange-400/80 font-semibold">🗳️ {totalVotes} votes</span>
                            <span className="text-[10px] text-red-400/80 font-semibold">⚔️ {takes.length} warriors</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ========== SCROLLABLE CHAT ========== */}
            {debate ? (
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto no-scrollbar pb-32 relative z-10">
                    <div className="sticky top-0 z-20 px-4 py-2.5 bg-gradient-to-b from-red-950/80 via-black/90 to-transparent">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                <SwordsIcon className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">War Zone</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-red-500/50 via-orange-500/30 to-transparent" />
                            <span className="text-[9px] text-red-400/60 font-medium animate-pulse">🔥 {takes.length} active</span>
                        </div>
                    </div>

                    <div className="px-3 space-y-2 pt-2">
                        {takes.map((take, index) => {
                            const isMe = take.authorUserId === user?.userId;
                            const userVote = userTakeVotes.get(take.id);
                            const isEditing = editingTake === take.id;

                            return (
                                <div key={take.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    {/* Avatar with Profile Picture */}
                                    {take.authorAvatarUrl ? (
                                        <img
                                            src={take.authorAvatarUrl}
                                            alt=""
                                            className="w-8 h-8 rounded-full flex-shrink-0 object-cover shadow-md"
                                            style={{ boxShadow: `0 2px 8px ${take.authorAvatarColor || '#6366f1'}50` }}
                                        />
                                    ) : (
                                        <div
                                            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-md"
                                            style={{ backgroundColor: take.authorAvatarColor || '#6366f1', boxShadow: `0 2px 8px ${take.authorAvatarColor || '#6366f1'}50` }}
                                        >
                                            {(take.authorAnonId || 'AN').substring(0, 2).toUpperCase()}
                                        </div>
                                    )}

                                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        {/* Name & Actions */}
                                        <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <span className={`text-[11px] font-semibold ${isMe ? 'text-orange-400' : 'text-gray-400'}`}>
                                                {take.authorDisplayName || take.authorAnonId || 'Anon'}
                                            </span>
                                            {take.isEdited && <span className="text-[9px] text-gray-600">(edited)</span>}
                                            <span className="text-[10px] text-gray-600">
                                                {take.createdAt instanceof Date
                                                    ? take.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()
                                                    : 'now'}
                                            </span>

                                            {/* More Menu for Own Messages */}
                                            {isMe && !isEditing && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowMenuFor(showMenuFor === take.id ? null : take.id)}
                                                        className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                                    >
                                                        <MoreIcon className="w-3.5 h-3.5 text-gray-500" />
                                                    </button>

                                                    {showMenuFor === take.id && (
                                                        <div className="absolute right-0 top-6 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-30 overflow-hidden min-w-[120px]">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingTake(take.id);
                                                                    setEditText(take.text);
                                                                    setShowMenuFor(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
                                                            >
                                                                <EditIcon className="w-3.5 h-3.5" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTake(take.id)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Message Bubble */}
                                        {isEditing ? (
                                            <div className="flex flex-col gap-2">
                                                <textarea
                                                    value={editText}
                                                    onChange={e => setEditText(e.target.value)}
                                                    className="w-full bg-white/10 text-white text-[14px] px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:border-orange-500/50 resize-none"
                                                    rows={2}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setEditingTake(null); setEditText(''); }}
                                                        className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditTake(take.id)}
                                                        className="px-3 py-1 text-xs bg-orange-500 text-white rounded-lg"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className={`px-3 py-2 rounded-2xl ${isMe
                                                    ? 'bg-gradient-to-br from-orange-500/90 to-red-600/90 rounded-tr-sm'
                                                    : 'bg-white/[0.08] border border-white/10 rounded-tl-sm'
                                                    }`}
                                            >
                                                <p className="text-[14px] leading-relaxed text-white whitespace-pre-wrap break-words">
                                                    {take.text}
                                                </p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        {!isEditing && (
                                            <div className={`flex items-center gap-0.5 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <button
                                                    onClick={() => handleTakeVote(take.id, 'up')}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${userVote === 'up' ? 'text-pink-400' : 'text-gray-600 active:text-pink-400'
                                                        }`}
                                                >
                                                    <HeartIcon className="w-3.5 h-3.5" filled={userVote === 'up'} />
                                                    {take.upvotes > 0 && <span className="text-[10px] font-medium">{take.upvotes}</span>}
                                                </button>

                                                <button
                                                    onClick={() => { setReplyingTo(take); textareaRef.current?.focus(); }}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-gray-600 active:text-blue-400"
                                                >
                                                    <MessageIcon className="w-3.5 h-3.5" />
                                                    {take.replyCount > 0 && <span className="text-[10px] font-medium">{take.replyCount}</span>}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty State */}
                        {!isLoading && takes.length === 0 && (
                            <div className="py-16 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center mb-4 border border-orange-500/20">
                                    <SwordsIcon className="w-8 h-8 text-orange-400" />
                                </div>
                                <h3 className="text-base font-bold text-white mb-1">Start the War!</h3>
                                <p className="text-gray-500 text-sm max-w-[220px]">Be the first warrior to drop a hot take 🔥</p>
                            </div>
                        )}

                        {isLoading && (
                            <div className="py-16 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
                    {isLoading ? (
                        <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mb-6 border border-white/10">
                                <SwordsIcon className="w-10 h-10 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No Active Battle</h3>
                            <p className="text-gray-500 text-sm max-w-[260px]">The arena is quiet. Check back later for today's battle topic!</p>
                        </>
                    )}
                </div>
            )}

            {/* ========== COMPOSER ========== */}
            {isActive && debate && (
                <div className="absolute bottom-16 left-0 right-0 z-[100]">
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none" style={{ height: '150%' }} />

                    <div className="relative px-3 py-3">
                        {replyingTo && (
                            <div className="flex items-center justify-between mb-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <span className="text-[11px] text-gray-400">
                                    ↩ <span className="text-orange-400 font-semibold">{replyingTo.authorDisplayName || replyingTo.authorAnonId || 'Anon'}</span>
                                </span>
                                <button onClick={() => setReplyingTo(null)} className="text-gray-500 active:text-white text-xs px-2">✕</button>
                            </div>
                        )}

                        <div className="flex items-end gap-2">
                            <div className="flex-1 bg-white/[0.08] rounded-2xl border border-white/10 focus-within:border-orange-500/50 transition-all">
                                <textarea
                                    ref={textareaRef}
                                    value={newTake}
                                    onChange={e => setNewTake(e.target.value)}
                                    placeholder="Drop your hot take..."
                                    className="w-full bg-transparent text-white text-[14px] placeholder-gray-500 px-4 py-3 focus:outline-none resize-none max-h-24"
                                    rows={1}
                                    style={{ minHeight: '44px' }}
                                />
                            </div>

                            <button
                                disabled={!newTake.trim() || isPosting}
                                onClick={handlePostTake}
                                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${newTake.trim()
                                    ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30 active:scale-95'
                                    : 'bg-white/10'
                                    }`}
                            >
                                {isPosting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <SendIcon className={`w-5 h-5 ${newTake.trim() ? 'text-white' : 'text-gray-500'}`} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Click outside to close menu */}
            {showMenuFor && (
                <div className="fixed inset-0 z-20" onClick={() => setShowMenuFor(null)} />
            )}

            {/* Topic Polling Modal */}
            {showTopicPoll && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowTopicPoll(false)}>
                    <div
                        className="w-full max-w-lg bg-gradient-to-b from-gray-900 to-black rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">🗳️ Tomorrow's Battle</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Vote for the next hot topic</p>
                            </div>
                            <button
                                onClick={() => setShowTopicPoll(false)}
                                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-white/20"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Topic List */}
                        <div className="overflow-y-auto max-h-[50vh] px-4 py-3 space-y-2">
                            {suggestedTopics
                                .sort((a, b) => b.votes - a.votes)
                                .map((topic, idx) => (
                                    <button
                                        key={topic.id}
                                        className={`w-full p-3 rounded-xl border text-left transition-all ${idx === 0
                                            ? 'bg-orange-600/20 border-orange-500/50 ring-1 ring-orange-500/30'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                            }`}
                                        onClick={() => {
                                            setSuggestedTopics(prev =>
                                                prev.map(t => t.id === topic.id ? { ...t, votes: t.votes + 1 } : t)
                                            );
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-400'
                                                }`}>
                                                {idx === 0 ? '🔥' : idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">{topic.topic}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-gray-500">{topic.votes} votes</span>
                                                    {topic.isUserSuggested && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">User Suggested</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-orange-400 text-lg">👆</div>
                                        </div>
                                    </button>
                                ))}
                        </div>

                        {/* Suggest Your Own Topic */}
                        <div className="px-4 py-4 border-t border-white/10 bg-black/50">
                            <p className="text-xs font-bold text-gray-400 mb-2">💡 SUGGEST YOUR OWN</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTopicSuggestion}
                                    onChange={e => setNewTopicSuggestion(e.target.value)}
                                    placeholder="Your hot topic idea..."
                                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                                />
                                <button
                                    disabled={!newTopicSuggestion.trim()}
                                    onClick={() => {
                                        if (newTopicSuggestion.trim()) {
                                            setSuggestedTopics(prev => [
                                                ...prev,
                                                {
                                                    id: Date.now().toString(),
                                                    topic: newTopicSuggestion.trim(),
                                                    votes: 1,
                                                    isUserSuggested: true
                                                }
                                            ]);
                                            setNewTopicSuggestion('');
                                        }
                                    }}
                                    className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${newTopicSuggestion.trim()
                                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                                        : 'bg-white/10 text-gray-500'
                                        }`}
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebateView;
