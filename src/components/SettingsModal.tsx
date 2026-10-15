import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Moon,
  Sun,
  Laptop,
  Trash2,
  Shield,
  Info,
  Check,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllChats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onClearAllChats,
}) => {
  const { theme, setTheme } = useTheme();
  const { user, updateProfile, deleteAccount, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'general' | 'profile' | 'data' | 'privacy' | 'about'>('general');
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [avatarInput, setAvatarInput] = useState(user?.profileImage || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    'https://api.dicebear.com/7.x/bottts/svg?seed=astro',
    'https://api.dicebear.com/7.x/bottts/svg?seed=spark',
  ];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    await updateProfile({ name: nameInput.trim(), profileImage: avatarInput });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleConfirmClear = () => {
    onClearAllChats();
    setShowClearConfirm(false);
  };

  const handleConfirmDeleteAccount = async () => {
    await deleteAccount();
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Sidebar */}
        <div className="w-full md:w-52 bg-slate-50 dark:bg-slate-950 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-3 sm:p-4 shrink-0">
          <div className="flex items-center gap-2 mb-3 px-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Settings</h3>
          </div>

          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'general'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>General & Theme</span>
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('data')}
              className={`px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'data'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Data Controls</span>
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'privacy'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy & Security</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'about'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>About</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-5 md:p-6 overflow-y-auto relative">
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Interface Theme</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Customize the appearance of AI Chat Pro on this device.
                </p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-500" />
                    <span>Light</span>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-indigo-400" />
                    <span>Dark</span>
                  </button>

                  <button
                    onClick={() => setTheme('system')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
                      theme === 'system'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Laptop className="w-5 h-5 text-slate-400" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">AI Language Support</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  AI Chat Pro automatically understands prompts written in English, Hindi (हिंदी), and Hinglish (natural Romanized Hindi like "Bhai code optimize kardo"). You can also switch modes directly in the chat bar.
                </p>
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && user && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Profile Details</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your display name and avatar icon.
                </p>
              </div>

              {profileSaved && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Choose Avatar
                </label>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {sampleAvatars.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarInput(url)}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform cursor-pointer ${
                        avatarInput === url
                          ? 'border-indigo-600 scale-110 shadow-sm'
                          : 'border-transparent hover:scale-105'
                      }`}
                    >
                      <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* DATA CONTROLS TAB */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Conversation History</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage stored conversations and clear account data.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                    Clear all chat history
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Permanently delete all conversation threads from your account.
                  </div>
                </div>

                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              {showClearConfirm && (
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 dark:bg-rose-950/50 text-xs space-y-2">
                  <div className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Are you sure you want to clear all conversations?</span>
                  </div>
                  <p className="text-rose-600 dark:text-rose-300 text-[11px]">
                    This action cannot be undone. All saved chat messages will be deleted immediately.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmClear}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Yes, Clear All
                    </button>
                  </div>
                </div>
              )}

              {user && (
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs text-rose-700 dark:text-rose-400">
                      Delete Account
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Deletes your user credentials, profile, and all saved chats.
                    </div>
                  </div>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Delete Account
                  </button>
                </div>
              )}

              {showDeleteConfirm && (
                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 dark:bg-rose-950/50 text-xs space-y-2">
                  <div className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Permanently delete this account?</span>
                  </div>
                  <p className="text-rose-600 dark:text-rose-300 text-[11px]">
                    All your data, messages, and profile information will be purged immediately.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDeleteAccount}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PRIVACY & TERMS TAB */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Privacy Policy & Security</h4>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <h5 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    1. Isolated User Conversations
                  </h5>
                  <p>
                    Every user has their own private conversation database. Ownership checks are strictly enforced on every API request. No user can view or modify another user's chat history.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <h5 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    2. Secret Server-Side API Keys
                  </h5>
                  <p>
                    All Gemini AI interactions happen securely on the Node.js backend. Model keys are never sent to the client browser.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <h5 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                    3. Terms of Service
                  </h5>
                  <p>
                    AI Chat Pro is designed to assist with coding, writing, research, study, and creative tasks. Users should verify any critical factual outputs before relying on them for medical or legal decisions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 mx-auto flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  AI Chat Pro
                </h4>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Ask Anything. Learn Everything.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Version 2.4.0</p>
              </div>

              <div className="max-w-md mx-auto text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
                Built with the Gemini 3.8 Flash model, full streaming support, multi-language processing (English, Hindi, Hinglish), persistent conversation history, and responsive mobile design.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
