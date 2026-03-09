/**
 * Type definitions for Arc 4.1
 */

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning?: string;
    timestamp: number;
    sources?: Source[];
    searchSteps?: SearchStep[];
    isThinking?: boolean;
}

export interface SearchStep {
    id: string;
    label: string;
    status: 'pending' | 'in-progress' | 'completed';
}

export interface Source {
    id: string;
    title: string;
    content: string;
    url?: string;
    similarity: number;
    type: 'file' | 'web';
    favicon?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    updatedAt: number;
    preview: string;
}

export interface ChatSessionFull extends ChatSession {
    messages: Message[];
}

// API Response types
export interface ApiError {
    detail: string;
}

// Default model (just for display, backend handles actual model)
export const DEFAULT_MODEL_ID = 'moonshotai/kimi-k2:free';
