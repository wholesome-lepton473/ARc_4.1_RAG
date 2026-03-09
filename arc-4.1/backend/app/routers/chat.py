"""
Arc 4.1 Backend - Chat Router

REST API endpoints for chat session CRUD operations.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionUpdate, 
    ChatSessionSchema, 
    ChatSessionSummary
)
from app.schemas.message import MessageSchema
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/chats", tags=["chats"])


@router.get("", response_model=List[ChatSessionSummary])
async def list_chats(db: AsyncSession = Depends(get_db)):
    """List all chat sessions."""
    service = ChatService(db)
    return await service.list_sessions()


@router.post("", response_model=ChatSessionSchema, status_code=status.HTTP_201_CREATED)
async def create_chat(
    data: ChatSessionCreate = None,
    db: AsyncSession = Depends(get_db)
):
    """Create a new chat session."""
    service = ChatService(db)
    session = await service.create_session(data)
    
    return ChatSessionSchema(
        id=session.id,
        title=session.title,
        preview=session.preview,
        messages=[
            MessageSchema(
                id=m.id,
                role=m.role,
                content=m.content,
                timestamp=m.timestamp,
                reasoning=m.reasoning,
                sources=m.sources,
                search_steps=m.search_steps,
            )
            for m in session.messages
        ]
    )


@router.get("/{chat_id}", response_model=ChatSessionSchema)
async def get_chat(chat_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific chat session with all messages."""
    service = ChatService(db)
    session = await service.get_session(chat_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session {chat_id} not found"
        )
    
    return ChatSessionSchema(
        id=session.id,
        title=session.title,
        preview=session.preview,
        messages=[
            MessageSchema(
                id=m.id,
                role=m.role,
                content=m.content,
                timestamp=m.timestamp,
                reasoning=m.reasoning,
                sources=m.sources,
                search_steps=m.search_steps,
            )
            for m in session.messages
        ]
    )


@router.put("/{chat_id}", response_model=ChatSessionSchema)
async def update_chat(
    chat_id: str,
    data: ChatSessionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a chat session (title and/or messages)."""
    service = ChatService(db)
    session = await service.update_session(chat_id, data)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session {chat_id} not found"
        )
    
    # Reload to get updated messages
    session = await service.get_session(chat_id)
    
    return ChatSessionSchema(
        id=session.id,
        title=session.title,
        preview=session.preview,
        messages=[
            MessageSchema(
                id=m.id,
                role=m.role,
                content=m.content,
                timestamp=m.timestamp,
                reasoning=m.reasoning,
                sources=m.sources,
                search_steps=m.search_steps,
            )
            for m in session.messages
        ]
    )


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(chat_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a chat session."""
    service = ChatService(db)
    deleted = await service.delete_session(chat_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session {chat_id} not found"
        )
