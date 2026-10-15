import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { Conversation, Message } from './types/chat';

function ChatApp() {
  const { user, token, hasGeminiKey, logout, loginAsGuest } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeLanguage, setActiveLanguage] = useState('auto');

  // Modals & Drawers
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Auto-scroll to bottom of messages
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Load conversations when user or token changes
  const loadConversations = async () => {
    if (!token && !user) {
      setConversations([]);
      return;
    }
    try {
      const res = await fetch('/api/conversations', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [user, token]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K for New Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Select and load a conversation
  const handleSelectConversation = async (convId: string) => {
    if (convId === activeConversationId) return;

    if (isStreaming) {
      handleStopStreaming();
    }

    setActiveConversationId(convId);
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversation details:', err);
    }
  };

  // New Chat
  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveConversationId(null);
    setMessages([]);
    setStreamingText('');
  };

  // Stop Generation
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    if (streamingText.trim()) {
      const finalMsg: Message = {
        id: 'msg_stopped_' + Date.now(),
        conversationId: activeConversationId || 'temp',
        role: 'assistant',
        content: streamingText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, finalMsg]);
      setStreamingText('');
    }
  };

  // Send Message
  const handleSendMessage = async (promptText: string) => {
    if (!promptText.trim() || isStreaming) return;

    // Ensure session exists: if user is not authenticated, seamlessly sign in as guest!
    let activeToken = token;
    if (!activeToken && !user) {
      const guestRes = await loginAsGuest();
      if (!guestRes.success) {
        setIsAuthModalOpen(true);
        return;
      }
      activeToken = localStorage.getItem('aichatpro_token');
    }

    const optimisticUserMsg: Message = {
      id: 'msg_temp_' + Date.now(),
      conversationId: activeConversationId || 'pending',
      role: 'user',
      content: promptText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setIsStreaming(true);
    setStreamingText('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: promptText,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream from server.');

      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'conv_created') {
                setActiveConversationId(data.conversation.id);
                setConversations((prev) => [data.conversation, ...prev.filter((c) => c.id !== data.conversation.id)]);
              } else if (data.type === 'chunk') {
                accumulated += data.text;
                setStreamingText(accumulated);
              } else if (data.type === 'title_update') {
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === data.conversationId ? { ...c, title: data.title } : c
                  )
                );
              } else if (data.type === 'done') {
                if (data.message) {
                  setMessages((prev) => [...prev, data.message]);
                } else {
                  const fallbackAssistantMsg: Message = {
                    id: 'msg_' + Date.now(),
                    conversationId: activeConversationId || 'pending',
                    role: 'assistant',
                    content: accumulated,
                    createdAt: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, fallbackAssistantMsg]);
                }
                setStreamingText('');
                setIsStreaming(false);
                loadConversations();
              } else if (data.type === 'error') {
                const errorMsg: Message = {
                  id: 'msg_err_' + Date.now(),
                  conversationId: activeConversationId || 'pending',
                  role: 'assistant',
                  content: `❌ ${data.error}`,
                  createdAt: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, errorMsg]);
                setStreamingText('');
                setIsStreaming(false);
              }
            } catch (err) {
              console.error('Failed to parse SSE line:', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
      } else {
        console.error('Streaming request error:', err);
        const errorMsg: Message = {
          id: 'msg_err_' + Date.now(),
          conversationId: activeConversationId || 'pending',
          role: 'assistant',
          content: `⚠️ Connection failed: ${err.message || 'Please check your internet connection or server status.'}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
      setIsStreaming(false);
      setStreamingText('');
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Regenerate last response
  const handleRegenerate = async () => {
    if (messages.length === 0 || isStreaming) return;

    // Find the last assistant message
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;

    // Find the last user message
    let userMsgIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsgIndex = i;
        break;
      }
    }
    if (userMsgIndex === -1) return;
    const userMsg = messages[userMsgIndex];

    if (!activeConversationId) {
      setMessages((prev) => prev.slice(0, -1));
      handleSendMessage(userMsg.content);
      return;
    }

    // Remove last assistant message from local state
    setMessages((prev) => prev.slice(0, -1));
    setIsStreaming(true);
    setStreamingText('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversationId: activeConversationId,
          regenerateMessageId: lastMsg.id,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Failed to regenerate response');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream from server.');

      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                accumulated += data.text;
                setStreamingText(accumulated);
              } else if (data.type === 'done') {
                if (data.message) {
                  setMessages((prev) => [...prev, data.message]);
                }
                setStreamingText('');
                setIsStreaming(false);
              }
            } catch (err) {
              console.error('SSE parse error:', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Regenerate error:', err);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      abortControllerRef.current = null;
    }
  };

  // Edit and resend user message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId || isStreaming) return;

    try {
      const res = await fetch('/api/chat/edit', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversationId: activeConversationId,
          messageId,
          newContent,
        }),
      });

      if (res.ok) {
        // Update local messages up to edited message
        const targetIdx = messages.findIndex((m) => m.id === messageId);
        if (targetIdx !== -1) {
          const updatedMessages = messages.slice(0, targetIdx + 1).map((m) =>
            m.id === messageId ? { ...m, content: newContent } : m
          );
          setMessages(updatedMessages);

          // Now stream assistant response for edited state
          setIsStreaming(true);
          setStreamingText('');

          const controller = new AbortController();
          abortControllerRef.current = controller;

          const streamRes = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              conversationId: activeConversationId,
            }),
            signal: controller.signal,
          });

          if (streamRes.ok) {
            const reader = streamRes.body?.getReader();
            if (reader) {
              const decoder = new TextDecoder('utf-8');
              let accumulated = '';
              let buffer = '';

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'chunk') {
                      accumulated += data.text;
                      setStreamingText(accumulated);
                    } else if (data.type === 'done') {
                      if (data.message) {
                        setMessages((prev) => [...prev, data.message]);
                      }
                      setStreamingText('');
                      setIsStreaming(false);
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to edit and resend message:', err);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  // Rename conversation
  const handleRenameConversation = async (convId: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (activeConversationId === convId) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Clear all chats
  const handleClearAllChats = async () => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setConversations([]);
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to clear all conversations:', err);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Sidebar (Desktop & Mobile Drawer) */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        user={user}
        onLogout={logout}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Navbar */}
        <Navbar
          onToggleSidebar={() => setIsSidebarOpenMobile(true)}
          onNewChat={handleNewChat}
          conversationTitle={activeConversation?.title || (messages.length > 0 ? 'Chat' : 'AI Chat Pro')}
          onRenameTitle={activeConversationId ? (newTitle) => handleRenameConversation(activeConversationId, newTitle) : undefined}
          user={user}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          hasGeminiKey={hasGeminiKey}
        />

        {/* Central Conversation / Welcome Area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {messages.length === 0 && !streamingText ? (
            <WelcomeScreen onSelectPrompt={(prompt) => handleSendMessage(prompt)} />
          ) : (
            <div className="flex-1 pb-4">
              {messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id || index}
                  message={msg}
                  userName={user?.name || 'You'}
                  userAvatar={user?.profileImage}
                  onRegenerate={index === messages.length - 1 && msg.role === 'assistant' ? handleRegenerate : undefined}
                  onEditMessage={msg.role === 'user' ? handleEditMessage : undefined}
                />
              ))}

              {/* Live Streaming Assistant Message */}
              {isStreaming && (
                <ChatMessage
                  message={{
                    id: 'streaming_msg',
                    conversationId: activeConversationId || '',
                    role: 'assistant',
                    content: streamingText || 'Thinking...',
                    createdAt: new Date().toISOString(),
                  }}
                  isStreaming={true}
                />
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Message Input Bar (Fixed Bottom) */}
        <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-md">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSendMessage}
            onStop={handleStopStreaming}
            isStreaming={isStreaming}
            activeLanguage={activeLanguage}
            setActiveLanguage={setActiveLanguage}
          />
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onClearAllChats={handleClearAllChats}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
