"""
Arc 4.1 Backend - Documents Router

REST API endpoints for document ingestion and RAG search.
"""
import logging
from typing import List

from fastapi import APIRouter, Query, status
from pydantic import BaseModel

from app.services import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentIngestRequest(BaseModel):
    """Request to ingest a document."""
    name: str
    content: str


class DocumentIngestResponse(BaseModel):
    """Response after ingesting a document."""
    chunks_created: int
    source_name: str


class DocumentSearchResult(BaseModel):
    """A single search result."""
    id: str
    title: str
    content: str
    similarity: float
    type: str = "file"


class DocumentStatsResponse(BaseModel):
    """Document statistics."""
    total_chunks: int
    total_documents: int


@router.post("/ingest", response_model=DocumentIngestResponse)
async def ingest_document(data: DocumentIngestRequest):
    """Ingest a document into the ChromaDB knowledge base."""
    try:
        chunks_created = await rag_service.ingest_document(data.name, data.content)
        logger.info(f"Ingested {chunks_created} chunks from '{data.name}'")
        return DocumentIngestResponse(
            chunks_created=chunks_created,
            source_name=data.name
        )
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise


@router.get("/search", response_model=List[DocumentSearchResult])
async def search_documents(
    q: str = Query(..., description="Search query"),
    top_k: int = Query(5, ge=1, le=20, description="Number of results")
):
    """Search the vector knowledge base using semantic similarity."""
    results = await rag_service.search_documents(q, n_results=top_k)
    return [DocumentSearchResult(**r) for r in results]


@router.get("/stats", response_model=DocumentStatsResponse)
async def get_stats():
    """Get document statistics."""
    stats = await rag_service.get_stats()
    return DocumentStatsResponse(**stats)


@router.get("/sources")
async def list_sources():
    """Get list of all uploaded document sources."""
    sources = await rag_service.get_all_sources()
    return {"sources": sources}


@router.delete("/{source_name}")
async def delete_document(source_name: str):
    """Delete a specific document and all its chunks."""
    chunks_deleted = await rag_service.delete_by_source(source_name)
    logger.info(f"Deleted document '{source_name}' with {chunks_deleted} chunks")
    return {"deleted": True, "chunks_deleted": chunks_deleted, "source": source_name}


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_documents():
    """Clear all documents from the knowledge base."""
    await rag_service.clear_all()
    logger.info("Cleared all documents from vector store")
