import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RotateCw, Pencil, Sparkles, Volume2, ThumbsUp, ThumbsDown, X, AlertCircle } from 'lucide-react';
import { Message } from '../types/chat';
import { CodeBlock } from './CodeBlock';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  userAvatar?: string;
  userName?: string;
  onRegenerate?: () => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  userAvatar,
  userName = 'You',
  onRegenerate,
  onEditMessage,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    if (onEditMessage && editContent.trim() !== message.content) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content);
    // Simple language detection for Hindi/English
    if (/[\u0900-\u097F]/.test(message.content)) {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={`group w-full py-4 md:py-6 transition-colors border-b border-slate-100 dark:border-slate-800/40 ${
        isUser
          ? 'bg-transparent'
          : 'bg-slate-50/70 dark:bg-slate-900/40'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6 flex gap-3.5 md:gap-4.5 items-start">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <span>{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-sm ring-2 ring-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0 text-[15px] leading-relaxed">
          {/* Sender label and actions */}
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-xs tracking-wide uppercase text-slate-700 dark:text-slate-300">
              {isUser ? userName : 'AI Chat Pro'}
            </span>

            {/* Quick action icons */}
            {isUser && !isEditing && onEditMessage && (
              <button
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                title="Edit message"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="text-[11px]">Edit</span>
              </button>
            )}
          </div>

          {/* Body Content or Inline Editor */}
          {isUser && isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 rounded-lg border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y min-h-[90px]"
                rows={3}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : isUser ? (
            <div className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : !isUser && (message.content.startsWith('❌') || message.content.startsWith('⚠️')) ? (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-amber-800 dark:text-amber-300">
                    Temporary AI Service Notice
                  </div>
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
                    {message.content.replace(/^[❌⚠️]\s*/, '')}
                  </div>
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Retry Request</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-900 dark:text-slate-100 prose-chat break-words overflow-hidden">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    if (!inline && (match || codeString.includes('\n'))) {
                      return (
                        <CodeBlock
                          language={match ? match[1] : undefined}
                          value={codeString}
                        />
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children }: any) {
                    return (
                      <div className="overflow-x-auto my-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  a({ href, children }: any) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

              {isStreaming && (
                <span className="cursor-blink bg-indigo-500 dark:bg-indigo-400" />
              )}
            </div>
          )}

          {/* Action toolbar for assistant answers */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-2 mt-3 pt-2 text-slate-400 text-xs select-none">
              <button
                onClick={handleCopy}
                aria-label="Copy entire answer"
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Copy entire answer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Regenerate this response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}

              <button
                onClick={handleSpeak}
                className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  isSpeaking
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
              </button>

              <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
                className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  feedback === 'like' ? 'text-emerald-500' : 'hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
                className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  feedback === 'dislike' ? 'text-rose-500' : 'hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Bad response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
