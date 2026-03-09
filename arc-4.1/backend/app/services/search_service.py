"""
Arc 4.1 Backend - Tavily Web Search Service

Integrates Tavily API for real-time web search capabilities.
"""
import logging
from typing import List, Optional

from ..config import get_settings

logger = logging.getLogger(__name__)

# Lazy load Tavily client
_tavily_client = None


def _get_tavily_client():
    """Lazy load the Tavily client."""
    global _tavily_client
    if _tavily_client is None:
        settings = get_settings()
        if not settings.tavily_api_key:
            logger.warning("Tavily API key not configured - web search disabled")
            return None
        
        try:
            from tavily import TavilyClient
            _tavily_client = TavilyClient(api_key=settings.tavily_api_key)
            logger.info("Tavily client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Tavily client: {e}")
            return None
    
    return _tavily_client


async def search_web(query: str, max_results: int = 5) -> List[dict]:
    """
    Search the web using Tavily API.
    
    Args:
        query: Search query
        max_results: Maximum number of results
        
    Returns:
        List of search results with title, content, url, and similarity
    """
    client = _get_tavily_client()
    if client is None:
        return []
    
    try:
        # Tavily search with context optimized for AI
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_answer=False,
            include_raw_content=False
        )
        
        results = []
        if response and "results" in response:
            for i, result in enumerate(response["results"]):
                results.append({
                    "id": f"web_{i}",
                    "title": result.get("title", "Web Result"),
                    "content": result.get("content", ""),
                    "url": result.get("url", ""),
                    "similarity": 0.9 - (i * 0.05),  # Decreasing relevance score
                    "type": "web"
                })
        
        logger.info(f"Tavily search returned {len(results)} results for: {query[:50]}...")
        return results
        
    except Exception as e:
        logger.error(f"Tavily search error: {e}")
        return []


async def is_available() -> bool:
    """Check if Tavily search is available."""
    settings = get_settings()
    return settings.tavily_api_key is not None and len(settings.tavily_api_key) > 0
