"""
Arc 4.1 Backend - Document Schemas

Pydantic schemas for document/RAG validation.
"""
from typing import Optional, List
from pydantic import BaseModel


class DocumentIngestRequest(BaseModel):
    """Request schema for document ingestion."""
    name: str
    content: str


class DocumentIngestResponse(BaseModel):
    """Response schema for document ingestion."""
    chunks_created: int
    source_name: str


class DocumentSearchResult(BaseModel):
    """Search result from knowledge base."""
    id: str
    title: str
    content: str
    similarity: float
    type: str = "file"


class DocumentStatsResponse(BaseModel):
    """Document statistics response."""
    total_chunks: int
    total_documents: int
