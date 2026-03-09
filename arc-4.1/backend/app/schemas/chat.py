"""
Arc 4.1 Backend - Chat Schemas

Pydantic schemas for chat session validation.
"""
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.message import MessageSchema, MessageCreate


class ChatSessionBase(BaseModel):
    """Base chat session schema."""
    title: Optional[str] = "New Chat"


class ChatSessionCreate(ChatSessionBase):
    """Schema for creating a chat session."""
    id: Optional[str] = None  # Auto-generated if not provided
    messages: Optional[List[MessageCreate]] = []


class ChatSessionUpdate(BaseModel):
    """Schema for updating a chat session."""
    title: Optional[str] = None
    messages: Optional[List[MessageCreate]] = None


class ChatSessionSummary(BaseModel):
    """Summary schema for chat list."""
    id: str
    title: str
    updated_at: int  # Unix timestamp in ms
    preview: str
    
    class Config:
        from_attributes = True


class ChatSessionSchema(ChatSessionBase):
    """Full chat session schema with messages."""
    id: str
    messages: List[MessageSchema] = []
    preview: str = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True
