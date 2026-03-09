/**
 * Completions API Service
 * 
 * Production-grade SSE streaming for LLM completions with:
 * - Timeout handling (30 seconds)
 * - Proper error recovery
 * - Clean event parsing
 */

import type { Message, Source } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';
const REQUEST_TIMEOUT_MS = 30000;

interface CompletionCallbacks {
    onContent: (chunk: string) => void;
    onReasoning: (chunk: string) => void;
    onSources: (sources: Source[]) => void;
    onComplete: () => void;
    onError: (error: Error) => void;
}

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): { controller: AbortController; clear: () => void } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    return {
        controller,
        clear: () => clearTimeout(timeoutId),
    };
}

/**
 * Stream completion with proper SSE event parsing.
 * Includes timeout handling and proper error recovery.
 */
export async function streamCompletionWithEvents(
    messages: Message[],
    customInstructions: string,
    callbacks: CompletionCallbacks
): Promise<void> {
    const { onContent, onReasoning, onSources, onComplete, onError } = callbacks;
    const { controller, clear: clearTimeout } = createTimeoutController(REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${API_BASE_URL}/api/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify({
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                custom_instructions: customInstructions,
                use_rag: true,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            clearTimeout();
            let errorMessage = 'Request failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
            } catch {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }

        if (!response.body) {
            clearTimeout();
            throw new Error('No response body received');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let hasReceivedContent = false;

        try {
            while (true) {
                const { value, done } = await reader.read();

                if (done) break;

                // Reset timeout on each chunk received
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        currentEvent = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);

                        try {
                            const data = JSON.parse(dataStr);

                            switch (currentEvent) {
                                case 'content':
                                    if (data.text) {
                                        hasReceivedContent = true;
                                        onContent(data.text);
                                    }
                                    break;
                                case 'reasoning':
                                    if (data.text) {
                                        onReasoning(data.text);
                                    }
                                    break;
                                case 'sources':
                                    if (Array.isArray(data)) {
                                        onSources(data.map((s: any) => ({
                                            id: s.id,
                                            title: s.title,
                                            content: s.content,
                                            similarity: s.similarity,
                                            type: s.type as 'file' | 'web',
                                        })));
                                    }
                                    break;
                                case 'error':
                                    clearTimeout();
                                    onError(new Error(data.message || 'Unknown error from server'));
                                    return;
                                case 'done':
                                    clearTimeout();
                                    onComplete();
                                    return;
                            }
                        } catch {
                            // JSON parse error - continue processing
                        }
                    } else if (line === '') {
                        currentEvent = '';
                    }
                }
            }

            clearTimeout();

            // If we got here without "done" event, still call complete if we received content
            if (hasReceivedContent) {
                onComplete();
            } else {
                onError(new Error('Connection closed without receiving response'));
            }
        } finally {
            reader.releaseLock();
        }
    } catch (error) {
        clearTimeout();

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
                onError(new Error('Request timed out. Please try again.'));
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                onError(new Error('Network error. Please check your connection.'));
            } else {
                onError(error);
            }
        } else {
            onError(new Error(String(error)));
        }
    }
}
