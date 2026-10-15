import React, { useState } from 'react';
import { Menu, Plus, Moon, Sun, Sparkles, Pencil, Check, X, ShieldAlert } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types/chat';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  conversationTitle?: string;
  onRenameTitle?: (newTitle: string) => void;
  user: User | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  hasGeminiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onNewChat,
  conversationTitle = 'New Chat',
  onRenameTitle,
  user,
  onOpenAuth,
  onOpenSettings,
  hasGeminiKey,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(conversationTitle);

  const handleSaveTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim() && onRenameTitle) {
      onRenameTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-3 sm:px-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Left section: Drawer toggle & Model info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Open chat history menu"
          className="p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-semibold text-[11px] tracking-wide">Gemini 3.8 Flash</span>
        </div>

        {/* Missing API Key Warning badge if applicable */}
        {!hasGeminiKey && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Set GEMINI_API_KEY</span>
          </div>
        )}
      </div>

      {/* Center: Conversation Title with rename option */}
      <div className="flex-1 max-w-md mx-2 text-center truncate">
        {isEditingTitle ? (
          <form onSubmit={handleSaveTitle} className="inline-flex items-center gap-1">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              autoFocus
              className="px-2 py-0.5 text-xs rounded border border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
            />
            <button type="submit" className="p-1 text-emerald-600 hover:text-emerald-700">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsEditingTitle(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <div className="inline-flex items-center gap-1.5 group max-w-full">
            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {conversationTitle}
            </span>
            {onRenameTitle && conversationTitle !== 'New Chat' && (
              <button
                onClick={() => {
                  setTitleInput(conversationTitle);
                  setIsEditingTitle(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity cursor-pointer"
                title="Rename conversation"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* New Chat quick button */}
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="New Chat"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* User avatar or sign in */}
        {user ? (
          <button
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold overflow-hidden shadow-xs cursor-pointer ring-1 ring-slate-300 dark:ring-slate-700"
            title="Account & Settings"
          >
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span>{user.name.charAt(0).toUpperCase()}</span>
            )}
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
