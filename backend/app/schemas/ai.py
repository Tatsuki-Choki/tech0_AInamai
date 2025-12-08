from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    """AI principal chat request."""
    message: str


class ChatResponse(BaseModel):
    """AI principal chat response."""
    response: str


class TeacherAdviceResponse(BaseModel):
    """Teacher advice response."""
    advice: str
    student_name: str
    theme: Optional[str] = None
    report_count: int
    current_streak: int
    max_streak: int
