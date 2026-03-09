/**
 * Chat API Service
 * 
 * Handles chat session CRUD operations.
 */

import { get, post, put, del } from './client';
import type { ChatSession, ChatSessionFull, Message } from '../types';

interface MessageCreate {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatCreateRequest {
    id?: string;
    title?: string;
    messages?: MessageCreate[];
}

interface ChatUpdateRequest {
    title?: string;
    messages?: MessageCreate[];
}

/**
 * List all chat sessions (summary only).
 */
export async function getChatHistory(): Promise<ChatSession[]> {
    return get<ChatSession[]>('/api/chats');
}

/**
 * Get a specific chat with all messages.
 */
export async function loadChat(id: string): Promise<ChatSessionFull | null> {
    try {
        return await get<ChatSessionFull>(`/api/chats/${id}`);
    } catch (error) {
        console.error('Error loading chat:', error);
        return null;
    }
}

/**
 * Create a new chat session.
 */
export async function createChat(data?: ChatCreateRequest): Promise<ChatSessionFull> {
    return post<ChatSessionFull>('/api/chats', data || {});
}

/**
 * Save/update a chat session with messages.
 */
export async function saveChat(
    id: string,
    messages: Message[],
    title?: string
): Promise<ChatSessionFull> {
    const updateData: ChatUpdateRequest = {
        messages: messages.map(m => ({
            role: m.role,
            content: m.content,
        })),
    };

    if (title) {
        updateData.title = title;
    }

    try {
        return await put<ChatSessionFull>(`/api/chats/${id}`, updateData);
    } catch (error: any) {
        // If chat doesn't exist, create it
        if (error.status === 404) {
            return createChat({
                id,
                title,
                messages: updateData.messages,
            });
        }
        throw error;
    }
}

/**
 * Delete a chat session.
 */
export async function deleteChat(id: string): Promise<void> {
    return del(`/api/chats/${id}`);
}
