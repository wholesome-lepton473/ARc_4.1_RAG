"""
Arc 4.1 Backend - Chat Models

SQLAlchemy models for chat sessions and messages.
"""
from datetime import datetime
from typing import List
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ChatSession(Base):
    """Chat session model."""
    
    __tablename__ = "chat_sessions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), default="New Chat")
    preview: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationship to messages
    messages: Mapped[List["Message"]] = relationship(
        "Message",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.timestamp"
    )


class Message(Base):
    """Chat message model."""
    
    __tablename__ = "messages"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(String(20))  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, default="")
    reasoning: Mapped[str] = mapped_column(Text, nullable=True)
    timestamp: Mapped[int] = mapped_column(Integer)  # Unix timestamp in ms
    sources: Mapped[list] = mapped_column(JSON, nullable=True)
    search_steps: Mapped[list] = mapped_column(JSON, nullable=True)
    
    # Relationship to session
    session: Mapped["ChatSession"] = relationship(
        "ChatSession", back_populates="messages"
    )
