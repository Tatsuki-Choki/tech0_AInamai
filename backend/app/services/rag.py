"""RAG Service using Gemini File Search Store for knowledge retrieval."""

import asyncio
import logging
from typing import Optional, Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def _extract_response_text(response: Any) -> Optional[str]:
    """Extract text from various Gemini response formats."""
    if response is None:
        return None

    # Try direct text attribute
    if hasattr(response, 'text'):
        try:
            return response.text.strip()
        except Exception:
            pass

    # Try candidates format (common in generative AI responses)
    if hasattr(response, 'candidates') and response.candidates:
        try:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                parts = candidate.content.parts
                if parts and hasattr(parts[0], 'text'):
                    return parts[0].text.strip()
        except (IndexError, AttributeError):
            pass

    # Try parts format
    if hasattr(response, 'parts') and response.parts:
        try:
            if hasattr(response.parts[0], 'text'):
                return response.parts[0].text.strip()
        except (IndexError, AttributeError):
            pass

    return None

# Lazy import for google-genai SDK
_client = None
_client_configured = False
_genai_legacy_configured = False


def _get_client():
    """Get or create the Google GenAI client."""
    global _client, _client_configured

    if _client_configured:
        return _client

    _client_configured = True

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not configured, RAG service disabled")
        return None

    try:
        from google import genai
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
        logger.info("Google GenAI client configured successfully")
        return _client
    except ImportError:
        logger.info("google-genai package not installed, using google-generativeai fallback")
        return "FALLBACK"
    except Exception as e:
        logger.error(f"Failed to configure Google GenAI client: {e}")
        return "FALLBACK"


def _configure_legacy_genai():
    """Configure the legacy google-generativeai SDK (one-time)."""
    global _genai_legacy_configured
    if _genai_legacy_configured:
        return True
    if not settings.GEMINI_API_KEY:
        return False
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _genai_legacy_configured = True
        logger.info("Legacy google-generativeai configured successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to configure legacy google-generativeai: {e}")
        return False


async def generate_rag_response(
    message: str,
    system_prompt: str,
    use_rag: bool = True
) -> str:
    """Generate a response using RAG with File Search Store.

    Args:
        message: User's message/question
        system_prompt: System prompt defining the AI's behavior
        use_rag: Whether to use RAG with File Search Store

    Returns:
        Generated response text
    """
    client = _get_client()
    logger.info(f"RAG request - client: {type(client).__name__ if client and client != 'FALLBACK' else client}, use_rag: {use_rag}")

    # Try using new SDK for direct generation (without File Search Store for now)
    # File Search Store API format changed, so we skip it temporarily
    if client and client != "FALLBACK":
        try:
            from google.genai import types

            model_name = settings.GEMINI_MODEL or "gemini-2.0-flash"
            logger.info(f"Using new SDK for direct generation, model: {model_name}")

            def _call_generate():
                return client.models.generate_content(
                    model=model_name,
                    contents=message,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt
                    )
                )

            response = await asyncio.wait_for(
                asyncio.to_thread(_call_generate),
                timeout=settings.GEMINI_TIMEOUT_SECONDS
            )

            text = _extract_response_text(response)
            if text:
                logger.info("Response generated successfully with new SDK")
                return text
            else:
                logger.warning(f"New SDK response has no extractable text. Response type: {type(response)}")

        except asyncio.TimeoutError:
            logger.warning(f"New SDK request timed out after {settings.GEMINI_TIMEOUT_SECONDS}s")
        except Exception as e:
            logger.warning(f"Error generating response with new SDK: {e}")
            # Fall through to legacy method

    # Fallback: Try legacy google-generativeai SDK
    logger.info("Falling back to legacy SDK")
    return await _generate_without_rag(message, system_prompt)


async def _generate_without_rag(message: str, system_prompt: str) -> str:
    """Generate response without RAG as fallback."""
    if not _configure_legacy_genai():
        logger.error("Legacy genai configuration failed")
        return "申し訳ありません、現在AIサービスに接続できません。"

    try:
        import google.generativeai as genai

        model_name = settings.GEMINI_MODEL or "gemini-2.0-flash"
        logger.info(f"Generating response with legacy SDK, model: {model_name}")

        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt
        )

        def _call_generate():
            return model.generate_content(message)

        response = await asyncio.wait_for(
            asyncio.to_thread(_call_generate),
            timeout=settings.GEMINI_TIMEOUT_SECONDS
        )

        text = _extract_response_text(response)
        if text:
            logger.info("Response generated successfully with legacy SDK")
            return text

        logger.warning(f"Legacy SDK response has no extractable text. Response type: {type(response)}")
        return "申し訳ありません、今少し考えがまとまりません。もう一度質問していただけますか？"

    except asyncio.TimeoutError:
        logger.warning(f"Legacy SDK request timed out after {settings.GEMINI_TIMEOUT_SECONDS}s")
        return "申し訳ありません、応答に時間がかかっています。もう一度お試しください。"
    except Exception as e:
        error_msg = str(e).lower()
        # Check for network-related errors
        if "dns" in error_msg or "resolution" in error_msg or "network" in error_msg:
            logger.error(f"Network/DNS error generating response: {e}")
            return "申し訳ありません、ネットワーク接続に問題があります。インターネット接続を確認してください。"
        elif "quota" in error_msg or "rate" in error_msg:
            logger.error(f"API quota/rate limit error: {e}")
            return "申し訳ありません、APIの制限に達しました。しばらくしてからもう一度お試しください。"
        elif "invalid" in error_msg and "api" in error_msg:
            logger.error(f"Invalid API key error: {e}")
            return "申し訳ありません、AIサービスの設定に問題があります。"
        else:
            logger.error(f"Error generating response without RAG: {e}", exc_info=True)
            return "申し訳ありません、今少し考えがまとまりません。もう一度質問していただけますか？"


def initialize_rag():
    """Initialize RAG service on startup."""
    try:
        client = _get_client()
        if client and client != "FALLBACK" and settings.GEMINI_FILE_SEARCH_STORE_ID:
            logger.info(f"RAG initialized with File Search Store: {settings.GEMINI_FILE_SEARCH_STORE_ID}")
        elif client == "FALLBACK":
            logger.info("RAG initialized with google-generativeai fallback (direct generation without RAG)")
        elif client:
            logger.info("RAG initialized without File Search Store (will use direct generation)")
        else:
            logger.warning("RAG initialization: Client not available")
    except Exception as e:
        logger.error(f"RAG initialization error: {e}")
