import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { MessageBubble } from './components/MessageBubble';
import type { Message, SearchStep, ChatSession } from './types';
import { getChatHistory, loadChat, saveChat, deleteChat } from './api/chatApi';
import { ingestDocument, clearKnowledgeBase, getKnowledgeStats } from './api/documentsApi';
import { streamCompletionWithEvents } from './api/completionsApi';
import { Plus, Send, Upload, Trash2, Paperclip, ChevronDown, PanelLeftClose, Settings as SettingsIcon, Menu, Moon, Sun, Archive, Check, X, AlertCircle, RefreshCw } from 'lucide-react';

// Error notification component
const ErrorToast: React.FC<{ message: string; onDismiss: () => void; onRetry?: () => void }> = ({ message, onDismiss, onRetry }) => (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center gap-3 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{message}</span>
            {onRetry && (
                <button onClick={onRetry} className="p-1 hover:bg-white/20 rounded transition-colors" title="Retry">
                    <RefreshCw size={16} />
                </button>
            )}
            <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded transition-colors">
                <X size={16} />
            </button>
        </div>
    </div>
);

export default function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Database State
    const [sessionId, setSessionId] = useState<string>(() => Date.now().toString());
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [hasSavedCurrentChat, setHasSavedCurrentChat] = useState(false);

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [customInstructions, setCustomInstructions] = useState('');

    const [knowledgeStats, setKnowledgeStats] = useState(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastSendRef = useRef<{ messages: Message[]; input: string } | null>(null);

    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    // Load History on Mount
    useEffect(() => {
        refreshHistory();
        loadKnowledgeStats();
    }, []);

    const refreshHistory = useCallback(async () => {
        try {
            const history = await getChatHistory();
            setChatHistory(history);
        } catch (err) {
            console.error('Failed to load chat history:', err);
        }
    }, []);

    const loadKnowledgeStats = useCallback(async () => {
        try {
            const stats = await getKnowledgeStats();
            setKnowledgeStats(stats);
        } catch (err) {
            console.error('Failed to load knowledge stats:', err);
        }
    }, []);

    // Save chat after assistant responds (not on every message change)
    const saveChatToHistory = useCallback(async (currentMessages: Message[]) => {
        if (currentMessages.length < 2) return; // Need at least user + assistant message

        const hasAssistantResponse = currentMessages.some(
            m => m.role === 'assistant' && m.content.trim().length > 0
        );

        if (!hasAssistantResponse) return;

        try {
            await saveChat(sessionId, currentMessages);
            setHasSavedCurrentChat(true);
            await refreshHistory();
        } catch (err) {
            console.error('Failed to save chat:', err);
        }
    }, [sessionId, refreshHistory]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const handleScroll = useCallback(() => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
            setShouldAutoScroll(isAtBottom);
        }
    }, []);

    useEffect(() => {
        if (shouldAutoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, shouldAutoScroll]);

    const forceScrollToBottom = useCallback(() => {
        setShouldAutoScroll(true);
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 10);
    }, []);

    const updateBotMessage = useCallback((id: string, updates: Partial<Message>) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    }, []);

    const resetUIState = useCallback(() => {
        setMessages([]);
        setSessionId(Date.now().toString());
        setInput('');
        setIsSidebarOpen(false);
        setDeleteConfirmId(null);
        setHasSavedCurrentChat(false);
        setError(null);
    }, []);

    const handleNewChat = useCallback(async () => {
        // Only save if we have meaningful content
        if (messages.length >= 2 && hasSavedCurrentChat) {
            try {
                await saveChat(sessionId, messages);
                await refreshHistory();
            } catch (err) {
                console.error('Failed to save chat:', err);
            }
        }
        resetUIState();
    }, [messages, sessionId, hasSavedCurrentChat, refreshHistory, resetUIState]);

    const handleLoadChat = useCallback(async (id: string) => {
        if (isLoading) return;
        setDeleteConfirmId(null);
        setError(null);

        // Save current chat if it has content
        if (messages.length >= 2 && hasSavedCurrentChat) {
            try {
                await saveChat(sessionId, messages);
                await refreshHistory();
            } catch (err) {
                console.error('Failed to save current chat:', err);
            }
        }

        setIsLoading(true);
        try {
            const data = await loadChat(id);
            if (data) {
                setSessionId(id);
                setMessages(data.messages);
                setHasSavedCurrentChat(true);
            }
        } catch (err) {
            setError('Failed to load chat. Please try again.');
            console.error("Error loading chat", err);
        } finally {
            setIsLoading(false);
            setIsSidebarOpen(false);
        }
    }, [isLoading, messages, sessionId, hasSavedCurrentChat, refreshHistory]);

    const initiateDelete = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteConfirmId(id);
    }, []);

    const confirmDelete = useCallback(async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await deleteChat(id);

            if (id === sessionId) {
                resetUIState();
            } else {
                setDeleteConfirmId(null);
            }

            await refreshHistory();
        } catch (err) {
            setError('Failed to delete chat.');
            console.error('Delete error:', err);
        }
    }, [sessionId, refreshHistory, resetUIState]);

    const cancelDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmId(null);
    }, []);

    const handleSendMessage = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        setError(null);
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: Date.now()
        };

        // Store for retry
        lastSendRef.current = { messages: [...messages], input: input.trim() };

        setInput('');
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setIsLoading(true);
        forceScrollToBottom();

        const botMsgId = (Date.now() + 1).toString();
        const initialSteps: SearchStep[] = [
            { id: '1', label: 'Processing...', status: 'in-progress' },
        ];

        const botMsg: Message = {
            id: botMsgId,
            role: 'assistant',
            content: '',
            reasoning: '',
            timestamp: Date.now(),
            searchSteps: initialSteps,
            isThinking: true
        };
        setMessages(prev => [...prev, botMsg]);

        // ChatGPT style: Save to history immediately when user sends first message
        if (!hasSavedCurrentChat) {
            try {
                await saveChat(sessionId, newMessages);
                setHasSavedCurrentChat(true);
                await refreshHistory();
            } catch (err) {
                console.error('Failed to save initial chat:', err);
            }
        }

        try {
            let finalMessages: Message[] = [];

            await streamCompletionWithEvents(
                newMessages,
                customInstructions,
                {
                    onContent: (chunk) => {
                        setMessages(prev => {
                            const updated = prev.map(m =>
                                m.id === botMsgId ? { ...m, content: m.content + chunk, isThinking: false } : m
                            );
                            finalMessages = updated;
                            return updated;
                        });
                    },
                    onReasoning: (chunk) => {
                        setMessages(prev => {
                            const updated = prev.map(m =>
                                m.id === botMsgId ? { ...m, reasoning: (m.reasoning || '') + chunk } : m
                            );
                            finalMessages = updated;
                            return updated;
                        });
                    },
                    onSources: (sources) => {
                        updateBotMessage(botMsgId, {
                            sources,
                            searchSteps: [{ id: '1', label: 'Analyzing documents...', status: 'completed' }]
                        });
                    },
                    onComplete: async () => {
                        setIsLoading(false);
                        updateBotMessage(botMsgId, { isThinking: false });
                        lastSendRef.current = null;

                        // Save to history after successful completion
                        if (finalMessages.length > 0) {
                            await saveChatToHistory(finalMessages);
                        }
                    },
                    onError: (err) => {
                        setIsLoading(false);
                        const errorMsg = err.message || "Unknown error occurred";
                        updateBotMessage(botMsgId, {
                            content: `**Error:** ${errorMsg}`,
                            isThinking: false
                        });
                        setError(errorMsg);
                    }
                }
            );
        } catch (e: any) {
            console.error(e);
            setIsLoading(false);
            setError(e.message || 'An unexpected error occurred');
        }
    }, [input, isLoading, messages, customInstructions, forceScrollToBottom, updateBotMessage, saveChatToHistory, hasSavedCurrentChat, sessionId, refreshHistory]);

    const handleRetry = useCallback(() => {
        if (lastSendRef.current) {
            setInput(lastSendRef.current.input);
            setMessages(lastSendRef.current.messages);
            setError(null);
            // Trigger send after state updates
            setTimeout(() => {
                const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
                if (sendButton) sendButton.click();
            }, 100);
        }
    }, []);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            await ingestDocument(file.name, text);
            await loadKnowledgeStats();
        } catch (err) {
            setError('Failed to upload document');
            console.error('Failed to upload document:', err);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [loadKnowledgeStats]);

    const handleClearKnowledge = useCallback(async () => {
        try {
            await clearKnowledgeBase();
            setKnowledgeStats(0);
        } catch (err) {
            setError('Failed to clear knowledge base');
            console.error('Failed to clear knowledge base:', err);
        }
    }, []);

    // Group history by Today, Yesterday, Previous
    const groupedHistory = chatHistory.reduce((groups, chat) => {
        const date = new Date(chat.updatedAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let key = 'Previous 30 Days';
        if (date.toDateString() === today.toDateString()) key = 'Today';
        else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';

        if (!groups[key]) groups[key] = [];
        groups[key].push(chat);
        return groups;
    }, {} as Record<string, ChatSession[]>);

    const historyOrder = ['Today', 'Yesterday', 'Previous 30 Days'];

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                if (showSettings) setShowSettings(false);
                if (isSidebarOpen) setIsSidebarOpen(false);
            }
            // Cmd/Ctrl + N for new chat
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                handleNewChat();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showSettings, isSidebarOpen, handleNewChat]);

    return (
        <Layout
            isSidebarOpen={isSidebarOpen}
            onSidebarClose={() => setIsSidebarOpen(false)}
            sidebar={
                <div className="flex flex-col h-full bg-[var(--bg-sidebar)]">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 pb-0">
                        <button
                            onClick={handleNewChat}
                            className="flex-1 flex items-center justify-between p-2 hover:bg-[var(--bg-element-hover)] rounded-lg transition-colors border border-[var(--border-color)] text-sm text-[var(--text-primary)] group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="bg-[var(--text-primary)] text-[var(--bg-main)] rounded-sm p-0.5">
                                    <Plus size={14} strokeWidth={3} />
                                </div>
                                <span className="font-medium">New chat</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] bg-[var(--bg-main)] border border-[var(--border-color)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">⌘N</span>
                            </div>
                        </button>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-2 ml-2 hover:bg-[var(--bg-element-hover)] rounded-lg text-[var(--text-secondary)] md:hidden"
                        >
                            <PanelLeftClose size={18} />
                        </button>
                    </div>

                    {/* Chat History Section */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
                        {chatHistory.length === 0 && (
                            <div className="flex flex-col items-center justify-center mt-10 text-[var(--text-secondary)] opacity-50">
                                <Archive size={24} className="mb-2" />
                                <span className="text-xs">No history</span>
                            </div>
                        )}

                        {historyOrder.map(group => (
                            groupedHistory[group] && groupedHistory[group].length > 0 && (
                                <div key={group}>
                                    <div className="text-[11px] font-medium text-[var(--text-secondary)] px-2 mb-2 uppercase tracking-wide">{group}</div>
                                    <div className="space-y-0.5">
                                        {groupedHistory[group].map(chat => (
                                            <div
                                                key={chat.id}
                                                onClick={() => handleLoadChat(chat.id)}
                                                className={`group relative flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${chat.id === sessionId
                                                    ? 'bg-[var(--bg-element)] text-[var(--text-primary)]'
                                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-element-hover)] hover:text-[var(--text-primary)]'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <div className="text-sm truncate">{chat.title || 'Untitled Chat'}</div>
                                                </div>

                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                    {deleteConfirmId === chat.id ? (
                                                        <>
                                                            <button
                                                                onClick={(e) => confirmDelete(e, chat.id)}
                                                                className="p-1 rounded-md text-green-500 hover:bg-[var(--bg-main)] hover:shadow-sm transition-all"
                                                                title="Confirm Delete"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={cancelDelete}
                                                                className="p-1 rounded-md text-red-500 hover:bg-[var(--bg-main)] hover:shadow-sm transition-all"
                                                                title="Cancel"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => initiateDelete(e, chat.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[var(--bg-main)] rounded-md hover:text-red-500 hover:shadow-sm transition-all"
                                                            title="Delete chat"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>

                    {/* User Profile / Settings */}
                    <div className="p-3 border-t border-[var(--border-color)] mt-auto space-y-2">
                        <div className="px-2 pb-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-3 w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1"
                            >
                                <Upload size={12} />
                                <span>{knowledgeStats > 0 ? `${knowledgeStats} Documents Active` : 'Add Context (Optional)'}</span>
                            </button>
                            {knowledgeStats > 0 && (
                                <button
                                    onClick={handleClearKnowledge}
                                    className="flex items-center gap-3 w-full text-xs text-red-400 hover:text-red-500 transition-colors py-1 mt-1"
                                >
                                    <Trash2 size={12} />
                                    <span>Clear Context</span>
                                </button>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept=".txt,.md" onChange={handleFileUpload} />
                        </div>

                        <button
                            onClick={() => {
                                setShowSettings(true);
                                setIsSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-[var(--bg-element-hover)] rounded-lg text-[var(--text-primary)] transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-[var(--bg-element)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-color)] overflow-hidden relative">
                                <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-purple-500 opacity-20 absolute"></div>
                                <SettingsIcon size={14} className="relative z-10" />
                            </div>
                            <div className="flex flex-col items-start text-sm">
                                <span className="font-medium">Settings</span>
                            </div>
                        </button>
                    </div>
                </div>
            }
        >
            {/* Error Toast */}
            {error && (
                <ErrorToast
                    message={error}
                    onDismiss={() => setError(null)}
                    onRetry={lastSendRef.current ? handleRetry : undefined}
                />
            )}

            {/* Settings Dialog */}
            {showSettings && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[var(--bg-main)] rounded-xl shadow-2xl max-w-lg w-full p-6 animate-[fadeIn_0.2s_ease-out] border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-medium text-[var(--text-primary)]">Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-element-hover)] transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                            {/* Theme Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider text-[11px]">Theme</label>
                                <div className="flex gap-2 p-1 bg-[var(--bg-element)] rounded-lg border border-[var(--border-color)]">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${theme === 'light'
                                            ? 'bg-[var(--bg-main)] text-[var(--text-primary)] shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                    >
                                        <Sun size={16} />
                                        Light
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${theme === 'dark'
                                            ? 'bg-[#424242] text-white shadow-sm'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                    >
                                        <Moon size={16} />
                                        Dark
                                    </button>
                                </div>
                            </div>

                            {/* Personalization */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wider text-[11px]">Personalization</label>
                                <div className="space-y-2">
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        Add custom instructions that will be applied to every response.
                                    </p>
                                    <textarea
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                        placeholder="How would you like Arc to respond?"
                                        className="w-full h-32 bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg p-3 text-sm focus:ring-1 focus:ring-[var(--text-secondary)] focus:outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="w-full bg-[var(--text-primary)] hover:opacity-90 text-[var(--bg-main)] font-medium py-2.5 rounded-lg transition-all"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-10 md:justify-center">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:hidden"
                >
                    <Menu size={20} />
                </button>

                <div className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Arc 4.1</span>
                    <ChevronDown size={14} className="text-[var(--text-secondary)]" />
                </div>

                <div className="w-8 md:hidden"></div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto relative scroll-smooth"
            >
                <div className="max-w-[800px] mx-auto min-h-[calc(100vh-160px)] pb-10 pt-20 px-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center mt-[20vh] space-y-8 animate-[fadeIn_0.5s_ease-out]">
                            <div className="w-16 h-16 rounded-full bg-[var(--text-primary)] text-[var(--bg-main)] flex items-center justify-center mb-2">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">How can I help you today?</h1>

                            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                                {[
                                    { text: "Draft a professional email", sub: "to a client" },
                                    { text: "Explain complex topics", sub: "in simple terms" },
                                    { text: "Help me debug code", sub: "paste snippets here" },
                                    { text: "Creative writing ideas", sub: "for a story" },
                                ].map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(item.text)}
                                        className="p-3 bg-[var(--bg-element)] hover:bg-[var(--bg-element-hover)] border border-transparent hover:border-[var(--border-color)] rounded-xl text-left transition-all"
                                    >
                                        <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.text}</div>
                                        <div className="text-xs text-[var(--text-secondary)] truncate">{item.sub}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {messages.map((msg) => (
                                <div key={msg.id}>
                                    {msg.searchSteps && msg.isThinking && <ThinkingIndicator steps={msg.searchSteps} />}
                                    <MessageBubble message={msg} />
                                </div>
                            ))}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)] to-transparent pt-10 pb-6 px-4 z-10">
                <div className="max-w-[800px] mx-auto">
                    <div className="relative bg-[var(--input-bg)] rounded-[26px] shadow-lg focus-within:ring-1 focus-within:ring-[var(--border-color)] transition-all border border-[var(--border-color)]">
                        <button className="absolute left-3 bottom-3 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-element-hover)] transition-colors">
                            <Paperclip size={20} />
                        </button>

                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    if (!isLoading) handleSendMessage();
                                }
                            }}
                            placeholder="Message Arc 4.1..."
                            className="w-full bg-transparent border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-[16px] pl-12 pr-12 py-4 resize-none focus:ring-0 focus:outline-none max-h-52 custom-scrollbar"
                            rows={1}
                            style={{ minHeight: '56px' }}
                            disabled={isLoading}
                        />

                        <button
                            data-send-button
                            onClick={handleSendMessage}
                            disabled={isLoading || !input.trim()}
                            className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${input.trim()
                                ? 'bg-[var(--text-primary)] text-[var(--bg-main)] hover:opacity-90'
                                : 'bg-[var(--bg-element-hover)] text-[var(--text-secondary)] cursor-not-allowed'
                                }`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Send size={18} fill={input.trim() ? "currentColor" : "none"} />
                            )}
                        </button>
                    </div>
                    <div className="text-center mt-2 text-xs text-[var(--text-secondary)]">
                        Arc 4.1 can make mistakes. Consider checking important information.
                    </div>
                </div>
            </div>
        </Layout>
    );
}
