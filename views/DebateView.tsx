import React, { useState, useEffect, useRef } from 'react';
import { User, Debate, DebateTake, VoteType } from '../types';
import * as debateService from '../services/debateService';
import { getAuth } from 'firebase/auth';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface DebateViewProps {
    user: User | null;
    isActive?: boolean;
}

const DebateView: React.FC<DebateViewProps> = ({ user, isActive = false }) => {
    const [debate, setDebate] = useState<Debate | null>(null);
    const [takes, setTakes] = useState<DebateTake[]>([]);
    const [newTake, setNewTake] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [creatingTopic, setCreatingTopic] = useState('');
    const [adminCollege, setAdminCollege] = useState('');
    const [myVote, setMyVote] = useState<VoteType | null>(null);
    const [replyingTo, setReplyingTo] = useState<DebateTake | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const auth = getAuth();

    // -- Admin Check --
    useEffect(() => {
        const email = auth.currentUser?.email;
        if (email?.toLowerCase() === 'jayaprakash.5388@gmail.com') {
            setIsAdmin(true);
        }
    }, [auth.currentUser]);

    // -- Fetch Debate --
    useEffect(() => {
        if (!user?.college) return;
        const fetchDebate = async () => {
            const active = await debateService.getActiveDebate(user.college!);
            if (active) {
                setDebate(active);
                const unsub = debateService.subscribeToDebate(active.id, (updated) => setDebate(updated));
                const fetchedTakes = await debateService.getDebateTakes(active.id);
                setTakes(fetchedTakes);
                return () => unsub();
            } else {
                setDebate(null);
            }
        };
        fetchDebate();
    }, [user?.college]);

    // -- Auto-resize Composer --
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [newTake]);

    // -- Interaction Handlers --
    const triggerHaptic = () => {
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
    };

    const handleVoteDebate = async (type: VoteType) => {
        if (!debate) return;
        triggerHaptic();
        setMyVote(type);
        await debateService.voteOnDebate(debate.id, type);
    };

    const handlePostTake = async () => {
        if (!newTake.trim() || !user || !debate) return;
        setIsPosting(true);
        triggerHaptic();

        const success = await debateService.postDebateTake(debate.id, newTake, 'text', replyingTo?.id);

        if (success) {
            const tempTake: DebateTake = {
                id: 'temp-' + Date.now(),
                debateId: debate.id,
                authorAnonId: user.anonId,
                authorAvatarColor: user.avatarColor,
                text: newTake,
                type: 'text',
                upvotes: 0,
                downvotes: 0,
                replyCount: 0,
                createdAt: new Date(),
                // @ts-ignore
                replyToId: replyingTo?.id || null
            };
            setTakes([tempTake, ...takes]);
            setNewTake('');
            setReplyingTo(null);
        }
        setIsPosting(false);
    };

    const handleTakeVote = async (takeId: string, type: 'up' | 'down') => {
        if (!debate) return;
        triggerHaptic();
        setTakes(prev => prev.map(t => {
            if (t.id === takeId) {
                return {
                    ...t,
                    upvotes: type === 'up' ? t.upvotes + 1 : t.upvotes,
                    downvotes: type === 'down' ? t.downvotes + 1 : t.downvotes
                };
            }
            return t;
        }));
        await debateService.voteOnTake(debate.id, takeId, type);
    };

    const handleCreateDebate = async () => {
        if (!creatingTopic.trim()) return;
        const targetCollege = adminCollege || user?.college || '';
        if (!targetCollege) { alert("No college target"); return; }
        await debateService.createDebate(creatingTopic, targetCollege);
        setCreatingTopic('');
        window.location.reload();
    };


    if (!user) return null;

    return (
        <div className="flex flex-col h-full bg-black text-white font-sans relative">

            {/* Minimal Sticky Header */}
            <div className="flex-shrink-0 sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-between">
                <h1 className="text-lg font-bold tracking-tight">Debate</h1>
                {debate && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        Live
                    </span>
                )}
            </div>

            {/* Main Scroll View */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

                {/* Admin Panel */}
                {isAdmin && !debate && (
                    <div className="p-6 border-b border-white/10 space-y-3">
                        <h3 className="font-bold text-sm text-gray-400">Launch Topic</h3>
                        <input
                            className="w-full bg-white/5 p-3 rounded-lg text-sm border border-white/10 focus:border-white/30 outline-none"
                            placeholder="College Name"
                            value={adminCollege} onChange={e => setAdminCollege(e.target.value)}
                        />
                        <textarea
                            className="w-full bg-white/5 p-3 rounded-lg text-sm border border-white/10 focus:border-white/30 outline-none"
                            placeholder="Topic..."
                            rows={2}
                            value={creatingTopic} onChange={e => setCreatingTopic(e.target.value)}
                        />
                        <button onClick={handleCreateDebate} className="w-full bg-white text-black font-bold py-3 rounded-lg text-sm">Launch Debate</button>
                    </div>
                )}

                {debate ? (
                    <>
                        {/* Topic Section */}
                        <div className="px-4 py-6 border-b border-white/5">
                            <h2 className="text-2xl font-bold leading-tight mb-4 text-white">
                                {debate.topic}
                            </h2>

                            {/* Minimalism Opinion Bar */}
                            <div className="flex items-center gap-1 h-10 bg-white/5 rounded-full p-1 border border-white/5">
                                <button
                                    onClick={() => handleVoteDebate('agree')}
                                    className={`flex-1 h-full rounded-full text-xs font-bold transition-all ${myVote === 'agree' ? 'bg-[#00ba7c] text-white' : 'text-gray-400 hover:bg-white/5'}`}
                                >
                                    Agree {debate.stats?.agree ? `(${debate.stats.agree})` : ''}
                                </button>
                                <button
                                    onClick={() => handleVoteDebate('neutral')}
                                    className={`flex-1 h-full rounded-full text-xs font-bold transition-all ${myVote === 'neutral' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                                >
                                    Neutral
                                </button>
                                <button
                                    onClick={() => handleVoteDebate('disagree')}
                                    className={`flex-1 h-full rounded-full text-xs font-bold transition-all ${myVote === 'disagree' ? 'bg-[#f4212e] text-white' : 'text-gray-400 hover:bg-white/5'}`}
                                >
                                    Disagree {debate.stats?.disagree ? `(${debate.stats.disagree})` : ''}
                                </button>
                            </div>
                        </div>

                        {/* Takes Feed (Threads Style) */}
                        <div className="divide-y divide-white/5">
                            {takes.map(take => {
                                const isMe = take.authorAnonId === user?.anonId;
                                // @ts-ignore
                                const isReply = !!take.replyToId;

                                return (
                                    <div key={take.id} className="px-4 py-4 hover:bg-white/[0.02] transition-colors relative">
                                        {/* Reply Context Line */}
                                        {isReply && <div className="absolute left-[26px] top-0 bottom-full w-[2px] bg-white/10"></div>}

                                        <div className="flex gap-3">
                                            {/* Avatar */}
                                            <div
                                                className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-black/60 shadow-inner"
                                                style={{ backgroundColor: take.authorAvatarColor || '#333' }}
                                            >
                                                {/* Simple Initials */}
                                                {(take.authorAnonId || 'AN').substring(0, 2).toUpperCase()}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Header Line */}
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-[15px] text-white">
                                                            {isMe ? 'You' : (take.authorAnonId || 'Anonymous')}
                                                        </span>
                                                        <span className="text-gray-500 text-sm">•</span>
                                                        <span className="text-gray-500 text-sm">
                                                            {take.createdAt instanceof Date ?
                                                                take.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase()
                                                                : 'now'
                                                            }
                                                        </span>
                                                    </div>

                                                    {/* More Menu (Visual) */}
                                                    <button className="text-gray-600 hover:text-white transition-colors">
                                                        •••
                                                    </button>
                                                </div>

                                                {/* Take Text */}
                                                <p className="text-[15px] leading-normal text-gray-200 whitespace-pre-wrap break-words font-light">
                                                    {take.text}
                                                </p>

                                                {/* Actions Row */}
                                                <div className="flex items-center gap-6 mt-3">

                                                    {/* Upvote */}
                                                    <button
                                                        onClick={() => handleTakeVote(take.id, 'up')}
                                                        className="flex items-center gap-1.5 group"
                                                    >
                                                        <div className="p-1.5 rounded-full group-hover:bg-[#f91880]/10 transition-colors">
                                                            <svg className={`w-4 h-4 ${take.upvotes > 0 ? 'text-[#f91880] fill-current' : 'text-gray-500'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                                                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                            </svg>
                                                        </div>
                                                        {take.upvotes > 0 && <span className="text-xs text-gray-500 group-hover:text-[#f91880]">{take.upvotes}</span>}
                                                    </button>

                                                    {/* Reply */}
                                                    <button
                                                        onClick={() => {
                                                            setReplyingTo(take);
                                                            textareaRef.current?.focus();
                                                        }}
                                                        className="flex items-center gap-1.5 group"
                                                    >
                                                        <div className="p-1.5 rounded-full group-hover:bg-[#1d9bf0]/10 transition-colors">
                                                            <svg className="w-4 h-4 text-gray-500 group-hover:text-[#1d9bf0]" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                            </svg>
                                                        </div>
                                                        {take.replyCount > 0 && <span className="text-xs text-gray-500 group-hover:text-[#1d9bf0]">{take.replyCount}</span>}
                                                    </button>

                                                    {/* Downvote */}
                                                    <button
                                                        onClick={() => handleTakeVote(take.id, 'down')}
                                                        className="flex items-center gap-1.5 group"
                                                    >
                                                        <div className="p-1.5 rounded-full group-hover:bg-white/10 transition-colors">
                                                            <svg className="w-4 h-4 text-gray-500 group-hover:text-white" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                            </svg>
                                                        </div>
                                                    </button>

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Empty State */}
                            {takes.length === 0 && (
                                <div className="py-20 text-center px-8">
                                    <div className="text-4xl mb-4 opacity-20">💬</div>
                                    <p className="text-gray-500 text-sm">No takes yet. Start the conversation.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                        <h3 className="text-lg font-bold text-gray-300 mb-2">No Active Debate</h3>
                        <p className="text-sm">Check back later for today's topic.</p>
                    </div>
                )}
            </div>

            {/* Composer (Absolute Overlay - Moves with Swipe) */}
            {isActive && debate && (
                <div className="absolute bottom-16 left-0 right-0 bg-black border-t border-white/10 px-4 py-3 pb-2 transition-all z-[100]">

                    {/* Reply Context */}
                    {replyingTo && (
                        <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-xs text-gray-400">
                                Replying to <span className="text-cyan-400 font-bold">{replyingTo.authorAnonId || 'Anonymous'}</span>
                            </span>
                            <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white text-xs">✕ Cancel</button>
                        </div>
                    )}

                    <div className="flex items-end gap-3">
                        <div className="flex-1 bg-white/[0.08] rounded-2xl min-h-[44px] border border-transparent focus-within:border-white/20 transition-all flex flex-col">
                            <textarea
                                ref={textareaRef}
                                value={newTake}
                                onChange={e => setNewTake(e.target.value)}
                                placeholder="Add to the debate..."
                                className="w-full bg-transparent text-white text-[15px] placeholder-gray-500 p-3 pt-3 focus:outline-none resize-none max-h-32"
                                rows={1}
                                style={{ minHeight: '44px' }}
                            />
                        </div>

                        <div className="flex items-center gap-1 mb-0.5">
                            {/* Minimal Send Button */}
                            <button
                                disabled={!newTake.trim() || isPosting}
                                onClick={handlePostTake}
                                className={`h-10 px-4 rounded-full font-bold text-sm transition-all ${newTake.trim()
                                    ? 'bg-white text-black hover:bg-gray-200'
                                    : 'bg-white/10 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isPosting ? '...' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebateView;
