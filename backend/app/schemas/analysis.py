from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date


class ReportAnalyzeRequest(BaseModel):
    """報告内容のAI分析リクエスト"""
    content: str
    theme_id: Optional[UUID] = None


class CapabilityScore(BaseModel):
    """能力スコア（フロントエンド互換形式）"""
    id: UUID
    name: str
    score: int  # 0-100
    description: Optional[str] = None


class ReportAnalyzeResponse(BaseModel):
    """AI分析結果レスポンス"""
    suggested_phase: Optional[str] = None
    suggested_phase_id: Optional[UUID] = None
    suggested_abilities: List[CapabilityScore] = []
    ai_comment: str


class CalendarDateEntry(BaseModel):
    """カレンダー表示用の日付エントリ"""
    date: date
    report_count: int


class CalendarResponse(BaseModel):
    """カレンダー表示用レスポンス"""
    dates: List[CalendarDateEntry]
    year: int
    month: int


class BadgeInfo(BaseModel):
    """獲得バッジ情報"""
    id: str
    name: str
    description: str
    earned: bool
    earned_at: Optional[date] = None


class CapabilitySummary(BaseModel):
    """能力サマリー（レーダーチャート用）"""
    id: UUID
    name: str
    count: int
    percentage: int  # 0-100（全体に対する割合）


class ReportSummaryResponse(BaseModel):
    """振り返りサマリーレスポンス"""
    total_reports: int
    current_streak: int
    max_streak: int
    capabilities: List[CapabilitySummary]
    badges: List[BadgeInfo]
    phase_distribution: dict  # フェーズ別の報告数
