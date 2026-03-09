/**
 * Documents API Service
 * 
 * Handles RAG document operations with ChromaDB vector store.
 */

import { get, post, del } from './client';
import type { Source } from '../types';

interface DocumentStats {
    total_chunks: number;
    total_documents: number;
}

interface SourcesResponse {
    sources: string[];
}

/**
 * Ingest a document into the knowledge base.
 */
export async function ingestDocument(
    name: string,
    content: string
): Promise<{ chunks_created: number; source_name: string }> {
    return post('/api/documents/ingest', { name, content });
}

/**
 * Search the knowledge base.
 */
export async function searchKnowledgeBase(query: string): Promise<Source[]> {
    const results = await get<Array<{
        id: string;
        title: string;
        content: string;
        similarity: number;
        type: string;
    }>>(`/api/documents/search?q=${encodeURIComponent(query)}`);

    return results.map(r => ({
        id: r.id,
        title: r.title,
        content: r.content,
        similarity: r.similarity,
        type: r.type as 'file' | 'web',
    }));
}

/**
 * Get knowledge base statistics.
 */
export async function getKnowledgeStats(): Promise<number> {
    const stats = await get<DocumentStats>('/api/documents/stats');
    return stats.total_documents;
}

/**
 * Get list of all uploaded document sources.
 */
export async function getDocumentSources(): Promise<string[]> {
    const response = await get<SourcesResponse>('/api/documents/sources');
    return response.sources;
}

/**
 * Delete a specific document and all its chunks.
 */
export async function deleteDocument(sourceName: string): Promise<{
    deleted: boolean;
    chunks_deleted: number;
}> {
    return del(`/api/documents/${encodeURIComponent(sourceName)}`);
}

/**
 * Clear all documents from knowledge base.
 */
export async function clearKnowledgeBase(): Promise<void> {
    return del('/api/documents');
}
