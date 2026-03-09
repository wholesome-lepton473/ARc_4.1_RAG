"""
Arc 4.1 Backend - Message Schemas

Pydantic schemas for message validation.
"""
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class SourceSchema(BaseModel):
    """Source reference schema."""
    id: str
    title: str
    content: str
    url: Optional[str] = None
    similarity: float
    type: Literal["file", "web"]
    favicon: Optional[str] = None


class SearchStepSchema(BaseModel):
    """Search step for thinking indicator."""
    id: str
    label: str
    status: Literal["pending", "in-progress", "completed"]


class MessageBase(BaseModel):
    """Base message schema."""
    role: Literal["user", "assistant", "system"]
    content: str


class MessageCreate(MessageBase):
    """Schema for creating a message."""
    pass


class MessageSchema(MessageBase):
    """Full message schema."""
    id: str
    timestamp: int
    reasoning: Optional[str] = None
    sources: Optional[List[SourceSchema]] = None
    search_steps: Optional[List[SearchStepSchema]] = None
    
    class Config:
        from_attributes = True
