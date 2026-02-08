import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { CameraIcon, XMarkIcon, ChevronLeftIcon } from './Icons';
import { DEPARTMENTS, AVATAR_COLORS } from '../constants/config';
import { uploadAvatar } from '../services/userService';

interface EditProfileModalProps {
    user: User;
    onClose: () => void;
    onSave: (updatedUser: User) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
    const [editedName, setEditedName] = useState(user.displayName || '');
    const [editedDept, setEditedDept] = useState(user.department || '');
    const [editedColor, setEditedColor] = useState(user.avatarColor || AVATAR_COLORS[0]);
    const [editedAvatarUrl, setEditedAvatarUrl] = useState<string | undefined>(user.avatarUrl);
    const [imgError, setImgError] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [customDept, setCustomDept] = useState('');
    const [isOtherDept, setIsOtherDept] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const isStandardDept = DEPARTMENTS.some(d => d === user.department);
        if (isStandardDept) {
            setEditedDept(user.department);
            setIsOtherDept(false);
            setCustomDept('');
        } else {
            setEditedDept('Other');
            setIsOtherDept(true);
            setCustomDept(user.department);
        }
    }, [user]);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB');
            return;
        }
        setIsUploading(true);
        try {
            const url = await uploadAvatar(file);
            if (url) setEditedAvatarUrl(url);
        } catch (error) {
            console.error('Avatar upload failed:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveClick = () => {
        const finalDept = isOtherDept ? customDept.trim() : editedDept;
        if (!editedName.trim() || !finalDept) return;

        const updatedUser = {
            ...user,
            displayName: editedName.trim(),
            department: finalDept,
            avatarColor: editedColor,
            avatarUrl: editedAvatarUrl
        };
        onSave(updatedUser);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="w-full max-w-sm bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <button onClick={onClose} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-white font-bold text-lg">Edit Profile</h2>
                    <button
                        onClick={handleSaveClick}
                        disabled={isUploading || !editedName.trim()}
                        className="text-blue-500 font-bold text-sm disabled:opacity-50"
                    >
                        Save
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh] no-scrollbar">
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative group">
                            <div
                                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold text-white overflow-hidden ring-4 ring-black shadow-xl cursor-pointer"
                                style={{ backgroundColor: (editedAvatarUrl && !imgError) ? 'transparent' : editedColor }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {editedAvatarUrl && !imgError ? (
                                    <img
                                        src={editedAvatarUrl}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    (editedName || 'A').charAt(0).toUpperCase()
                                )}

                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CameraIcon className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-2 border-[#1a1a1a] shadow-lg"
                            >
                                <CameraIcon className="w-4 h-4 text-white" />
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                        />
                        <p className="text-blue-400 text-xs font-medium mt-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            Change Profile Photo
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-5">
                        {/* Name Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Display Name</label>
                            <input
                                value={editedName}
                                onChange={e => setEditedName(e.target.value)}
                                className="w-full bg-black/40 text-white p-4 rounded-2xl border border-white/10 focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="Enter your name"
                            />
                        </div>

                        {/* Department Selection */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Department</label>
                            <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
                                <select
                                    value={isOtherDept ? 'Other' : editedDept}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === 'Other') {
                                            setIsOtherDept(true);
                                            setEditedDept('Other');
                                        } else {
                                            setIsOtherDept(false);
                                            setEditedDept(val);
                                        }
                                    }}
                                    className="w-full bg-transparent text-white p-4 appearance-none outline-none"
                                >
                                    {DEPARTMENTS.map(dept => (
                                        <option key={dept} value={dept} className="bg-[#1a1a1a] text-white">
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Custom Department Input */}
                        {isOtherDept && (
                            <div className="animate-fade-in">
                                <input
                                    value={customDept}
                                    onChange={e => setCustomDept(e.target.value)}
                                    className="w-full bg-black/40 text-white p-4 rounded-2xl border border-blue-500/30 focus:border-blue-500 focus:outline-none transition-colors"
                                    placeholder="Enter your department"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Color Selection (Only if no image) */}
                        {!editedAvatarUrl && (
                            <div className="space-y-2 pt-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Avatar Color</label>
                                <div className="flex flex-wrap gap-3">
                                    {AVATAR_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setEditedColor(color)}
                                            className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${editedColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
