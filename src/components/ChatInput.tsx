import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square, Sparkles, Languages } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  activeLanguage?: string;
  setActiveLanguage?: (lang: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  activeLanguage = 'auto',
  setActiveLanguage,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim()) {
        handleSubmit();
      }
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isStreaming || disabled) return;
    let finalPrompt = input.trim();
    if (activeLanguage === 'hi') {
      finalPrompt = `[Respond in Hindi / हिंदी]: ${finalPrompt}`;
    } else if (activeLanguage === 'hinglish') {
      finalPrompt = `[Respond in Hinglish / हिंग्लिश]: ${finalPrompt}`;
    }
    onSend(finalPrompt);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const languageOptions = [
    { id: 'auto', label: 'Auto Detect', badge: '🌐' },
    { id: 'en', label: 'English', badge: '🇺🇸' },
    { id: 'hi', label: 'हिंदी (Hindi)', badge: '🇮🇳' },
    { id: 'hinglish', label: 'Hinglish', badge: '🇮🇳' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-3 sm:pb-4 pt-1">
      {/* Quick Language bar */}
      <div className="flex items-center justify-between mb-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-[11px] font-medium hidden sm:inline text-slate-400">Mode:</span>
          {languageOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActiveLanguage && setActiveLanguage(opt.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                activeLanguage === opt.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{opt.badge}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 hidden md:inline">
          Use <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">Shift+Enter</kbd> for newline
        </span>
      </div>

      {/* Input container */}
      <div className="relative flex items-end rounded-2xl md:rounded-3xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-2 sm:p-2.5">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything in English, हिंदी, or Hinglish..."
          disabled={disabled}
          rows={1}
          className="flex-1 max-h-[180px] min-h-[40px] px-3 py-2 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm md:text-[15px] focus:outline-none resize-none leading-relaxed"
        />

        {/* Action Button: Send or Stop */}
        <div className="shrink-0 mb-0.5 ml-1">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating response"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md cursor-pointer"
              title="Stop generating"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              aria-label="Send message"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                input.trim() && !disabled
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-2 text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          AI Chat Pro can make mistakes. Verify important factual, legal, or medical information.
        </p>
      </div>
    </div>
  );
};
