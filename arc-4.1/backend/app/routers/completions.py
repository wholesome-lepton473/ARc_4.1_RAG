"""
Arc 4.1 Backend - Completions Router

SSE streaming endpoint for LLM completions with RAG and web search.
"""
import json
import logging
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.services.llm_service import stream_completion
from app.services import rag_service, search_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/completions", tags=["completions"])


class CompletionMessage(BaseModel):
    """A single message in the completion request."""
    role: str
    content: str


class CompletionRequest(BaseModel):
    """Request schema for streaming completion."""
    messages: List[CompletionMessage]
    custom_instructions: Optional[str] = ""
    model: Optional[str] = None
    use_rag: bool = True
    use_web_search: bool = True


async def event_generator(
    messages: List[dict],
    context: List[dict],
    custom_instructions: str,
    model: Optional[str] = None,
):
    """Generate SSE events from LLM stream."""
    # First, emit sources if we have context
    if context:
        yield {
            "event": "sources",
            "data": json.dumps(context)
        }
    
    # Stream LLM response
    async for chunk in stream_completion(messages, context, custom_instructions, model):
        if "error" in chunk:
            yield {
                "event": "error",
                "data": json.dumps({"message": chunk["error"]})
            }
            break
        elif "content" in chunk:
            yield {
                "event": "content",
                "data": json.dumps({"text": chunk["content"]})
            }
        elif "reasoning" in chunk:
            yield {
                "event": "reasoning", 
                "data": json.dumps({"text": chunk["reasoning"]})
            }
        elif "done" in chunk:
            yield {
                "event": "done",
                "data": json.dumps({"status": "completed"})
            }


@router.post("")
async def create_completion(request: CompletionRequest):
    """
    Stream a completion from the LLM.
    
    Combines:
    - RAG: Document vector search (if documents uploaded)
    - Web: Tavily search (if API key configured)
    
    Events:
    - sources: Context sources (RAG + web)
    - content: LLM response text
    - reasoning: Model's reasoning/thinking
    - error: Error message
    - done: Completion finished
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    
    # Get the query from the last user message
    query = ""
    user_messages = [m for m in messages if m["role"] == "user"]
    if user_messages:
        query = user_messages[-1]["content"]
    
    # Gather context from multiple sources
    context: List[dict] = []
    
    # Search document vector store (RAG)
    if request.use_rag and query:
        try:
            rag_results = await rag_service.search_documents(query, n_results=3)
            context.extend(rag_results)
            logger.info(f"RAG returned {len(rag_results)} results")
        except Exception as e:
            logger.error(f"RAG search error: {e}")
    
    # Search web via Tavily
    if request.use_web_search and query:
        try:
            web_results = await search_service.search_web(query, max_results=3)
            context.extend(web_results)
            logger.info(f"Tavily returned {len(web_results)} results")
        except Exception as e:
            logger.error(f"Tavily search error: {e}")
    
    # Sort by similarity (highest first)
    context.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    
    # Limit total context
    context = context[:5]
    
    return EventSourceResponse(
        event_generator(
            messages,
            context,
            request.custom_instructions or "",
            request.model
        ),
        media_type="text/event-stream"
    )
