"""
Arc 4.1 Backend - Chat Service

Business logic for chat CRUD operations.
"""
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import ChatSession, Message
from app.schemas.chat import ChatSessionCreate, ChatSessionUpdate, ChatSessionSummary
from app.schemas.message import MessageCreate


class ChatService:
    """Service for chat operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_session(
        self, 
        data: Optional[ChatSessionCreate] = None
    ) -> ChatSession:
        """Create a new chat session."""
        session_id = data.id if data and data.id else str(uuid.uuid4())
        title = data.title if data else "New Chat"
        
        session = ChatSession(
            id=session_id,
            title=title,
            preview="No messages yet",
        )
        self.db.add(session)
        await self.db.flush()
        
        # Add initial messages if provided
        if data and data.messages:
            for msg_data in data.messages:
                await self._add_message(session.id, msg_data)
        
        await self.db.commit()
        
        # Re-fetch with messages loaded to avoid MissingGreenlet
        return await self.get_session(session_id)
    
    async def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get a chat session by ID with messages."""
        result = await self.db.execute(
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.id == session_id)
        )
        return result.scalar_one_or_none()
    
    async def list_sessions(self) -> List[ChatSessionSummary]:
        """List all chat sessions (summary only)."""
        result = await self.db.execute(
            select(ChatSession)
            .order_by(ChatSession.updated_at.desc())
        )
        sessions = result.scalars().all()
        
        return [
            ChatSessionSummary(
                id=s.id,
                title=s.title,
                updated_at=int(s.updated_at.timestamp() * 1000),
                preview=s.preview
            )
            for s in sessions
        ]
    
    async def update_session(
        self, 
        session_id: str, 
        data: ChatSessionUpdate
    ) -> Optional[ChatSession]:
        """Update a chat session."""
        session = await self.get_session(session_id)
        if not session:
            return None
        
        # Update title if provided
        if data.title is not None:
            session.title = data.title
        
        # Replace messages if provided
        if data.messages is not None:
            # Delete existing messages
            await self.db.execute(
                delete(Message).where(Message.session_id == session_id)
            )
            
            # Add new messages
            for msg_data in data.messages:
                await self._add_message(session_id, msg_data)
            
            # Update preview from last message
            if data.messages:
                last_msg = data.messages[-1]
                session.preview = last_msg.content[:50] + ("..." if len(last_msg.content) > 50 else "")
                
                # Auto-generate title from first user message if still default
                if session.title == "New Chat":
                    first_user = next((m for m in data.messages if m.role == "user"), None)
                    if first_user:
                        session.title = first_user.content[:30] + ("..." if len(first_user.content) > 30 else "")
        
        session.updated_at = datetime.utcnow()
        await self.db.commit()
        
        # Re-fetch with messages loaded
        return await self.get_session(session_id)
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete a chat session."""
        result = await self.db.execute(
            delete(ChatSession).where(ChatSession.id == session_id)
        )
        await self.db.commit()
        return result.rowcount > 0
    
    async def _add_message(
        self, 
        session_id: str, 
        data: MessageCreate
    ) -> Message:
        """Add a message to a session."""
        message = Message(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role=data.role,
            content=data.content,
            timestamp=int(datetime.utcnow().timestamp() * 1000),
        )
        self.db.add(message)
        return message
