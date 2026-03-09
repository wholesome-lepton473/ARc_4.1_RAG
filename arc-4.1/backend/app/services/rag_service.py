"""
Arc 4.1 Backend - Vector RAG Service

Production-grade RAG using ChromaDB for vector storage
and sentence-transformers for embeddings.
"""
import logging
import uuid
from typing import List, Optional

from ..config import get_settings

logger = logging.getLogger(__name__)

# Lazy imports to avoid slow startup
_chroma_client = None
_collection = None
_embedding_function = None


def _get_embedding_function():
    """Lazy load the embedding function."""
    global _embedding_function
    if _embedding_function is None:
        from chromadb.utils import embedding_functions
        settings = get_settings()
        _embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=settings.embedding_model
        )
    return _embedding_function


def _get_collection():
    """Lazy load the ChromaDB collection."""
    global _chroma_client, _collection
    if _collection is None:
        import chromadb
        settings = get_settings()
        
        _chroma_client = chromadb.PersistentClient(
            path=settings.chroma_persist_directory
        )
        
        _collection = _chroma_client.get_or_create_collection(
            name="documents",
            embedding_function=_get_embedding_function(),
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"ChromaDB collection initialized with {_collection.count()} documents")
    
    return _collection


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks."""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        
        # Try to break at sentence boundary
        if end < len(text):
            last_period = chunk.rfind('.')
            last_newline = chunk.rfind('\n')
            break_point = max(last_period, last_newline)
            if break_point > chunk_size // 2:
                chunk = chunk[:break_point + 1]
                end = start + break_point + 1
        
        chunks.append(chunk.strip())
        start = end - overlap
    
    return [c for c in chunks if c]


async def ingest_document(name: str, content: str) -> int:
    """
    Ingest a document into the vector database.
    
    Args:
        name: Document name/title
        content: Full document text
        
    Returns:
        Number of chunks created
    """
    collection = _get_collection()
    chunks = chunk_text(content)
    
    if not chunks:
        return 0
    
    # Generate unique IDs for each chunk
    ids = [f"{name}_{i}_{uuid.uuid4().hex[:8]}" for i in range(len(chunks))]
    
    # Prepare metadata
    metadatas = [
        {
            "source": name,
            "chunk_index": i,
            "total_chunks": len(chunks)
        }
        for i in range(len(chunks))
    ]
    
    # Add to collection
    collection.add(
        ids=ids,
        documents=chunks,
        metadatas=metadatas
    )
    
    logger.info(f"Ingested document '{name}' with {len(chunks)} chunks")
    return len(chunks)


async def search_documents(query: str, n_results: int = 5) -> List[dict]:
    """
    Search for relevant document chunks using semantic similarity.
    
    Args:
        query: Search query
        n_results: Maximum number of results
        
    Returns:
        List of matching chunks with metadata
    """
    collection = _get_collection()
    
    if collection.count() == 0:
        return []
    
    try:
        results = collection.query(
            query_texts=[query],
            n_results=min(n_results, collection.count())
        )
        
        sources = []
        if results and results['documents'] and results['documents'][0]:
            for i, doc in enumerate(results['documents'][0]):
                metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                distance = results['distances'][0][i] if results['distances'] else 0
                
                # Convert distance to similarity (chromadb uses cosine distance)
                similarity = 1 - distance
                
                sources.append({
                    "id": results['ids'][0][i] if results['ids'] else str(i),
                    "title": metadata.get("source", "Unknown"),
                    "content": doc,
                    "similarity": round(similarity, 3),
                    "type": "file"
                })
        
        return sources
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        return []


async def get_stats() -> dict:
    """Get statistics about the document store."""
    collection = _get_collection()
    count = collection.count()
    
    # Get unique sources
    unique_sources = set()
    if count > 0:
        try:
            all_metadata = collection.get(include=["metadatas"])
            if all_metadata and all_metadata['metadatas']:
                unique_sources = {m.get("source") for m in all_metadata['metadatas'] if m}
        except Exception:
            pass
    
    return {
        "total_chunks": count,
        "total_documents": len(unique_sources)
    }


async def clear_all() -> None:
    """Clear all documents from the vector store."""
    global _collection
    collection = _get_collection()
    
    # Delete all documents by getting all IDs first
    if collection.count() > 0:
        all_ids = collection.get()['ids']
        if all_ids:
            collection.delete(ids=all_ids)
    
    logger.info("Cleared all documents from vector store")


async def delete_by_source(source_name: str) -> int:
    """
    Delete all chunks from a specific document source.
    
    Args:
        source_name: The source/document name to delete
        
    Returns:
        Number of chunks deleted
    """
    collection = _get_collection()
    
    if collection.count() == 0:
        return 0
    
    try:
        # Find all chunks with this source
        results = collection.get(
            where={"source": source_name},
            include=["metadatas"]
        )
        
        if results and results['ids']:
            chunk_count = len(results['ids'])
            collection.delete(ids=results['ids'])
            logger.info(f"Deleted {chunk_count} chunks from source '{source_name}'")
            return chunk_count
        
        return 0
        
    except Exception as e:
        logger.error(f"Error deleting source '{source_name}': {e}")
        return 0


async def get_all_sources() -> List[str]:
    """Get list of all unique document sources."""
    collection = _get_collection()
    
    if collection.count() == 0:
        return []
    
    try:
        all_metadata = collection.get(include=["metadatas"])
        if all_metadata and all_metadata['metadatas']:
            sources = list({m.get("source") for m in all_metadata['metadatas'] if m and m.get("source")})
            return sorted(sources)
        return []
    except Exception:
        return []
