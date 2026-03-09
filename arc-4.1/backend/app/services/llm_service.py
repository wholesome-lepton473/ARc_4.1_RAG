"""
Arc 4.1 Backend - LLM Service

OpenRouter API integration with SSE streaming support.
"""
import json
import logging
from typing import List, AsyncGenerator, Optional, Dict, Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


def build_system_prompt(
    context: List[Dict[str, Any]],
    custom_instructions: str = ""
) -> str:
    """Build the system prompt with optional context and personalization."""
    has_context = len(context) > 0
    context_text = ""
    
    if has_context:
        context_parts = []
        for s in context:
            source_type = s.get("type", "file")
            title = s.get("title", "Unknown")
            content = s.get("content", "")
            url = s.get("url", "")
            
            if source_type == "web" and url:
                context_parts.append(f"[Web: {title}]\nURL: {url}\n{content}")
            else:
                context_parts.append(f"[Document: {title}]\n{content}")
        
        context_text = "\n\n".join(context_parts)
    
    personalization = ""
    if custom_instructions.strip():
        personalization = f"\n\nUSER PERSONALIZATION / CUSTOM INSTRUCTIONS:\n{custom_instructions.strip()}"
    
    system_prompt = f"""You are Arc 4.1, an advanced general AI assistant.
     
GOAL: Provide a helpful, accurate, and well-formatted response to the user.

STRICT FORMATTING GUIDELINES:
1. **Structure**: Organize your response logically.
   - Use **Markdown Headers** (### or ####) to separate distinct sections.
   - Use **Bullet Points** for lists.
 
2. **Emphasis**: 
   - Use **bold** for key terms.
   - Use `code blocks` for technical terms or code snippets.
 
3. **Tone**:
   - Professional, objective, and precise.
{personalization}"""
    
    if has_context:
        system_prompt += f"""
    
CONTEXTUAL INFORMATION:
Use the following context to answer the user's question. Cite sources explicitly using [Source: Title] syntax inline where relevant.

{context_text}"""
    
    return system_prompt


async def stream_completion(
    messages: List[dict],
    context: List[Dict[str, Any]],
    custom_instructions: str = "",
    model: Optional[str] = None,
) -> AsyncGenerator[dict, None]:
    """
    Stream LLM completion from OpenRouter API.
    
    Yields dicts with either 'content' or 'reasoning' keys.
    """
    settings = get_settings()
    api_key = settings.openrouter_api_key
    model = model or settings.default_model
    
    # Build API messages
    system_prompt = build_system_prompt(context, custom_instructions)
    api_messages = [
        {"role": "system", "content": system_prompt},
        *messages
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://arc.demo",
        "X-Title": "Arc 4.1",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": model,
        "messages": api_messages,
        "stream": True,
        "temperature": 0.8,
        "provider": {"sort": "throughput"},
        "include_reasoning": True,
    }
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                OPENROUTER_API_URL,
                headers=headers,
                json=payload,
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    error_msg = "API Request Failed"
                    try:
                        error_data = json.loads(error_text)
                        # Handle various OpenRouter error formats
                        if isinstance(error_data, dict):
                            if "error" in error_data:
                                err = error_data["error"]
                                if isinstance(err, dict):
                                    error_msg = err.get("message", str(err))
                                else:
                                    error_msg = str(err)
                            elif "message" in error_data:
                                error_msg = error_data["message"]
                            else:
                                error_msg = str(error_data)
                    except json.JSONDecodeError:
                        error_msg = error_text.decode() if isinstance(error_text, bytes) else str(error_text)
                    
                    logger.error(f"OpenRouter API error: {error_msg}")
                    yield {"error": error_msg}
                    return
                
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            data = json.loads(line[6:])  # Remove "data: " prefix
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            
                            content = delta.get("content", "")
                            reasoning = delta.get("reasoning", "")
                            
                            if content:
                                yield {"content": content}
                            if reasoning:
                                yield {"reasoning": reasoning}
                                
                        except json.JSONDecodeError as e:
                            logger.warning(f"Error parsing stream chunk: {e}")
                            continue
    except httpx.TimeoutException:
        yield {"error": "Request timed out. Please try again."}
        return
    except httpx.ConnectError:
        yield {"error": "Failed to connect to OpenRouter API. Check your connection."}
        return
    except Exception as e:
        logger.error(f"LLM stream error: {e}")
        yield {"error": str(e)}
        return
    
    yield {"done": True}
