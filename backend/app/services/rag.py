"""RAG Service using Gemini File API for PDF-based knowledge retrieval."""

import os
import time
from pathlib import Path
from typing import Optional

from app.core.config import settings

# Lazy import and configuration for Gemini
genai = None
_genai_configured = False

# Cache for uploaded file reference
_uploaded_file = None
_file_upload_time: float = 0

# PDF file path - use environment variable or default
PDF_FILE_PATH = os.environ.get(
    "RAG_PDF_PATH",
    "/docs/Diary_App_RAG_Gemini/13歳からのアントレプレナーシップ.pdf"
)
PDF_DISPLAY_NAME = "entrepreneurship_book"

# File expiry time (Gemini files expire after 48 hours, refresh after 24 hours)
FILE_REFRESH_SECONDS = 24 * 60 * 60


def _configure_genai():
    """Lazily configure Gemini API."""
    global genai, _genai_configured

    if _genai_configured:
        return genai is not None

    _genai_configured = True

    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY not configured, RAG service disabled")
        return False

    try:
        import google.generativeai as _genai
        _genai.configure(api_key=settings.GEMINI_API_KEY)
        genai = _genai
        print("Gemini API configured successfully")
        return True
    except Exception as e:
        print(f"Failed to configure Gemini API: {e}")
        return False


def get_uploaded_file():
    """Get or upload the PDF file to Gemini.

    Returns the file reference for use in content generation.
    """
    global _uploaded_file, _file_upload_time

    if not _configure_genai():
        return None

    # Check if file is still valid
    current_time = time.time()
    if _uploaded_file and (current_time - _file_upload_time) < FILE_REFRESH_SECONDS:
        # Check if file still exists on Gemini
        try:
            file_info = genai.get_file(_uploaded_file.name)
            if file_info.state.name == "ACTIVE":
                return _uploaded_file
        except Exception as e:
            print(f"File check failed, will re-upload: {e}")
            _uploaded_file = None

    # Check if PDF exists
    if not os.path.exists(PDF_FILE_PATH):
        print(f"PDF file not found at {PDF_FILE_PATH} (RAG disabled)")
        return None

    # Check for existing uploaded files with the same display name
    try:
        for file in genai.list_files():
            if file.display_name == PDF_DISPLAY_NAME and file.state.name == "ACTIVE":
                print(f"Found existing uploaded file: {file.name}")
                _uploaded_file = file
                _file_upload_time = current_time
                return _uploaded_file
    except Exception as e:
        print(f"Error listing files: {e}")

    # Upload new file
    try:
        print(f"Uploading PDF from {PDF_FILE_PATH}...")
        uploaded_file = genai.upload_file(
            path=PDF_FILE_PATH,
            display_name=PDF_DISPLAY_NAME,
            mime_type="application/pdf"
        )

        # Wait for file to be processed
        print("Waiting for file processing...")
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)

        if uploaded_file.state.name == "ACTIVE":
            print(f"File uploaded successfully: {uploaded_file.name}")
            _uploaded_file = uploaded_file
            _file_upload_time = current_time
            return _uploaded_file
        else:
            print(f"File upload failed with state: {uploaded_file.state.name}")
            return None

    except Exception as e:
        print(f"Error uploading file: {e}")
        return None


async def generate_rag_response(
    message: str,
    system_prompt: str,
    use_rag: bool = True
) -> str:
    """Generate a response using RAG with the entrepreneurship book.

    Args:
        message: User's message/question
        system_prompt: System prompt defining the AI's behavior
        use_rag: Whether to include the PDF in the context

    Returns:
        Generated response text
    """
    if not _configure_genai():
        return "申し訳ありません、現在AIサービスに接続できません。"

    try:
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=system_prompt
        )

        contents = []

        # Add PDF file if RAG is enabled
        if use_rag:
            uploaded_file = get_uploaded_file()
            if uploaded_file:
                contents.append(uploaded_file)
                contents.append(
                    "上記の書籍「13歳からのアントレプレナーシップ」の内容を参考に、"
                    "以下の質問に答えてください。書籍の内容を引用する場合は、"
                    "具体的なページや章を示してください。\n\n"
                )

        contents.append(f"質問: {message}")

        response = await model.generate_content_async(contents)
        return response.text.strip()

    except Exception as e:
        print(f"Error generating RAG response: {e}")
        return "申し訳ありません、今少し考えがまとまりません。もう一度質問していただけますか？"


def initialize_rag():
    """Initialize RAG by uploading PDF on startup."""
    try:
        uploaded_file = get_uploaded_file()
        if uploaded_file:
            print(f"RAG initialized with file: {uploaded_file.name}")
        else:
            print("RAG initialization: PDF not uploaded yet")
    except Exception as e:
        print(f"RAG initialization error: {e}")
