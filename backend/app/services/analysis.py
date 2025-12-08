from typing import List, Optional, Tuple
from uuid import UUID
import google.generativeai as genai
import json
import re

from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)


ANALYZE_PROMPT = """あなたは探究学習の分析を支援するAIです。
生徒の報告内容を分析し、以下の情報を抽出してください。

## 7つの能力
1. 情報収集能力と先を見る力：トレンドを感知し、未来を予測する力
2. 課題設定能力と構想する力：課題を設定し、構想を練る力
3. 巻き込む力：他人を巻き込み、協力を得る力
4. 対話する力：対話を通じて相手を理解する力
5. 実行する力：小さなことから始め、実行に移す力
6. 謙虚である力：謙虚な姿勢で仲間を集める力
7. 完遂する力：諦めずにやり遂げる力

## 4つの探究フェーズ
1. 課題の設定
2. 情報の収集
3. 整理・分析
4. まとめ・表現

## 分析タスク
報告内容を読んで、以下を判定してください：
1. どの探究フェーズに該当するか（1つ選択）
2. どの能力が発揮されているか（複数可、スコア0-100で評価）
3. 励ましのコメント

## 入力
報告内容：{content}
研究テーマ：{theme}

## 出力（JSON形式のみ、マークダウンなし）
{{
  "phase": "フェーズ名",
  "abilities": [
    {{"name": "能力名", "score": スコア, "reason": "理由"}}
  ],
  "comment": "励ましコメント"
}}
"""


async def analyze_report_content(
    content: str,
    theme_title: Optional[str] = None,
) -> Tuple[Optional[str], List[dict], str]:
    """
    報告内容をAIで分析し、フェーズと能力を提案する。

    Returns:
        Tuple of (suggested_phase, abilities_list, ai_comment)
    """
    if not settings.GEMINI_API_KEY:
        return None, [], "AI分析機能は現在利用できません。"

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        prompt = ANALYZE_PROMPT.format(
            content=content,
            theme=theme_title or "未設定",
        )

        response = await model.generate_content_async(prompt)
        response_text = response.text.strip()

        # マークダウンのコードブロックを除去
        if response_text.startswith("```"):
            response_text = re.sub(r'^```json?\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)

        # JSONをパース
        result = json.loads(response_text)

        phase = result.get("phase")
        abilities = result.get("abilities", [])
        comment = result.get("comment", "素晴らしい取り組みですね！")

        return phase, abilities, comment

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}, response: {response_text}")
        return None, [], "分析結果の解析に失敗しました。"
    except Exception as e:
        print(f"Error analyzing report: {e}")
        return None, [], "分析中にエラーが発生しました。"


def calculate_badges(
    total_reports: int,
    current_streak: int,
    max_streak: int,
    ability_counts: dict,
) -> List[dict]:
    """
    獲得バッジを計算する。
    """
    badges = []

    # 報告数に基づくバッジ
    if total_reports >= 1:
        badges.append({
            "id": "first_report",
            "name": "はじめの一歩",
            "description": "最初の報告を投稿した",
            "earned": True,
        })

    if total_reports >= 10:
        badges.append({
            "id": "reporter_10",
            "name": "探究者",
            "description": "10回の報告を達成",
            "earned": True,
        })

    if total_reports >= 50:
        badges.append({
            "id": "reporter_50",
            "name": "熱心な探究者",
            "description": "50回の報告を達成",
            "earned": True,
        })

    if total_reports >= 100:
        badges.append({
            "id": "reporter_100",
            "name": "探究マスター",
            "description": "100回の報告を達成",
            "earned": True,
        })

    # 継続日数に基づくバッジ
    if max_streak >= 7:
        badges.append({
            "id": "streak_7",
            "name": "一週間継続",
            "description": "7日連続で報告を投稿",
            "earned": True,
        })

    if max_streak >= 30:
        badges.append({
            "id": "streak_30",
            "name": "一ヶ月継続",
            "description": "30日連続で報告を投稿",
            "earned": True,
        })

    # 能力バランスバッジ
    if ability_counts:
        non_zero_abilities = sum(1 for v in ability_counts.values() if v > 0)
        if non_zero_abilities >= 7:
            badges.append({
                "id": "balanced",
                "name": "バランス型",
                "description": "全7つの能力を発揮",
                "earned": True,
            })

    return badges
