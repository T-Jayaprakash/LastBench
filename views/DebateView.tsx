
import React, { useState, useEffect } from 'react';
import { User, Debate, DebateTake } from '../types';
import * as firestoreService from '../services/firestoreService';
import { auth } from '../services/firebase';
import { PlusCircleIcon } from '../components/Icons';

interface DebateViewProps {
    user: User | null;
}

const DebateView: React.FC<DebateViewProps> = ({ user }) => {
    const [debate, setDebate] = useState<Debate | null>(null);
    const [takes, setTakes] = useState<DebateTake[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTake, setNewTake] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [creatingTopic, setCreatingTopic] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [adminCollege, setAdminCollege] = useState(''); // Allow admin to switch colleges

    useEffect(() => {
        const checkAdmin = () => {
            // Hardcoded admin check as requested + collection check later if needed
            const email = auth.currentUser?.email;
            if (email?.toLowerCase() === 'jayaprakash.5388@gmail.com') {
                setIsAdmin(true);
            }
        };
        checkAdmin();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const collegeToFetch = (isAdmin && adminCollege) ? adminCollege : user.college || '';
        if (!collegeToFetch) return;

        const loadDebate = async () => {
            setLoading(true);
            const activeDebate = await firestoreService.getActiveDebate(collegeToFetch);
            setDebate(activeDebate);

            if (activeDebate) {
                const fetchedTakes = await firestoreService.getDebateTakes(activeDebate.id);
                setTakes(fetchedTakes);
            } else {
                setTakes([]);
            }
            setLoading(false);
        };
        loadDebate();
    }, [user, isAdmin, adminCollege]);

    const handleCreateDebate = async () => {
        if (!creatingTopic.trim() || !user) return;
        try {
            const targetCollege = adminCollege || user.college || 'Unknown';
            await firestoreService.createDebate(creatingTopic, targetCollege);
            setCreatingTopic('');
            // Reload
            const activeDebate = await firestoreService.getActiveDebate(targetCollege);
            setDebate(activeDebate);
        } catch (e) {
            alert('Failed to create debate');
        }
    };

    const handlePostTake = async () => {
        if (!newTake.trim() || !debate) return;
        setIsPosting(true);
        const success = await firestoreService.postDebateTake(debate.id, newTake);
        if (success) {
            setNewTake('');
            // Refresh takes
            const fetchedTakes = await firestoreService.getDebateTakes(debate.id);
            setTakes(fetchedTakes);
        }
        setIsPosting(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-black text-white">
                <div className="animate-spin h-8 w-8 border-2 border-accent-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-black text-white relative font-sans">
            {/* Header */}
            <div className="p-4 border-b border-gray-900 flex items-center justify-between bg-black/95 backdrop-blur-sm sticky top-0 z-20">
                <h1 className="text-lg font-bold tracking-tight">
                    DEBATE
                </h1>
                {isAdmin && (
                    <div className="text-[10px] font-bold text-black bg-white px-2 py-0.5 rounded-full tracking-wider">
                        ADMIN
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto pb-40">

                {/* Admin Logic: Select College */}
                {isAdmin && (
                    <div className="p-4 bg-gray-900/30 border-b border-gray-800">
                        <input
                            className="w-full bg-black text-white p-3 rounded-lg text-sm border border-gray-800 focus:border-white transition-colors outline-none"
                            placeholder="Target College (Admin Only)"
                            value={adminCollege}
                            onChange={e => setAdminCollege(e.target.value)}
                        />
                    </div>
                )}

                {debate ? (
                    <>
                        {/* Topic Header - Minimalist */}
                        <div className="px-4 py-6 border-b border-gray-900">
                            <h2 className="text-xl font-bold text-white mb-2 leading-snug">
                                {debate.topic}
                            </h2>
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                    LIVE IN {debate.college}
                                </p>
                            </div>
                        </div>

                        {/* Takes List - Clean Feed Style */}
                        <div className="px-4">
                            {takes.length === 0 ? (
                                <div className="py-20 text-center">
                                    <p className="text-gray-600 text-sm">Start the conversation...</p>
                                </div>
                            ) : (
                                takes.map(take => (
                                    <div key={take.id} className="py-4 border-b border-gray-900/50 flex space-x-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                                            style={{ backgroundColor: take.authorAvatarColor }}
                                        >
                                            {take.authorAnonId.substring(0, 2)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-sm font-semibold text-gray-400">{take.authorAnonId}</span>
                                                <span className="text-[10px] text-gray-700">Just now</span>
                                            </div>

                                            <p className="text-[15px] text-gray-200 mt-1 leading-relaxed whitespace-pre-wrap break-words">
                                                {take.text}
                                            </p>

                                            {/* Minimal Actions */}
                                            <div className="mt-2 flex items-center space-x-4">
                                                <button className="text-gray-600 hover:text-white transition-colors text-xs font-medium">
                                                    Reply
                                                </button>
                                                <button className="text-gray-600 hover:text-white transition-colors text-xs font-medium">
                                                    Like
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center p-6">
                        <h3 className="text-lg font-medium text-white mb-1">No Active Debate</h3>
                        <p className="text-gray-500 text-sm">Check back later for new topics in {user?.college}</p>

                        {isAdmin && (
                            <div className="mt-8 w-full max-w-xs">
                                <textarea
                                    className="w-full bg-[#1A1A1A] border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-white transition-colors text-sm"
                                    placeholder="Enter debate topic..."
                                    rows={3}
                                    value={creatingTopic}
                                    onChange={e => setCreatingTopic(e.target.value)}
                                />
                                <button
                                    onClick={handleCreateDebate}
                                    className="w-full mt-3 bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                >
                                    Launch Debate
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Fixed Input - Raised above Bottom Navigation */}
            {debate && (
                <div className="fixed bottom-[56px] left-0 right-0 bg-black border-t border-gray-900 p-3 z-30 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
                    <div className="flex items-end space-x-2">
                        <textarea
                            value={newTake}
                            onChange={e => setNewTake(e.target.value)}
                            placeholder="Add to the debate..."
                            className="flex-grow bg-[#121212] text-white rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-700 transition-all resize-none max-h-24"
                            rows={1}
                            style={{ minHeight: '44px' }}
                        />
                        <button
                            disabled={!newTake.trim() || isPosting}
                            onClick={handlePostTake}
                            className={`p-3 rounded-full flex-shrink-0 ${!newTake.trim() ? 'text-gray-600 bg-transparent' : 'bg-white text-black'} transition-colors duration-200`}
                        >
                            {isPosting ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <div className={!newTake.trim() ? 'opacity-50' : ''}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebateView;
