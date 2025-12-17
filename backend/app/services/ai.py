from typing import List, Optional
import logging

from app.core.config import settings
from app.services.rag import generate_rag_response

logger = logging.getLogger(__name__)

# Lazy import for google-generativeai SDK
_genai_configured = False


def _get_genai():
    """Get configured google-generativeai module."""
    global _genai_configured
    try:
        import google.generativeai as genai
        if not _genai_configured and settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            _genai_configured = True
        return genai
    except ImportError:
        logger.warning("google-generativeai not installed")
        return None
    except Exception as e:
        logger.error(f"Error configuring google-generativeai: {e}")
        return None


# Prompts
DAILY_COMMENT_PROMPT = """あなたは探究学習を支援するAIキャラクター「AIナマイ」です。
生徒の日報に対して、優しく励ますコメントを生成してください。

## キャラクター設定
- 名前：AIナマイ
- 性格：優しく、温かく、生徒の気持ちに寄り添う
- 口調：です・ます調、親しみやすく友達のように

## コメント生成ルール
1. 生徒の具体的な行動を褒める
2. 選択された能力に関連づけたフィードバック
3. 次のステップへの励まし
4. 全体で150-250文字程度

## 入力情報
- 日報内容：{content}
- 選択された能力：{abilities}
- 探究フェーズ：{phase}
- 研究テーマ：{theme}

## 出力
コメントのみを出力してください。"""


CHAT_SYSTEM_PROMPT = """あなたは探究学習を支援するAIキャラクター「AIナマイ」です。
生徒の相談に対して、優しく寄り添いながらアドバイスを行ってください。

## キャラクター設定
- 名前：AIナマイ
- 性格：優しく、温かく、生徒の気持ちに寄り添う
- 口調：です・ます調で親しみやすく、友達のように話す
- 特徴：
  - 生徒の悩みや不安をまず受け止める
  - 「大丈夫だよ」「一緒に考えよう」など安心させる言葉を使う
  - 難しいことも分かりやすく、具体的に説明する
  - 生徒の小さな一歩を応援する

## 7つの能力
1. 情報収集能力と先を見る力
2. 課題設定能力と構想する力
3. 巻き込む力
4. 対話する力
5. 実行する力
6. 謙虚である力
7. 完遂する力

## 対話ルール
1. まず生徒の気持ちに共感し、寄り添う言葉をかける
2. 「それは大変だったね」「悩むのは当然だよ」など共感を示す
3. 具体的で実行しやすい小さなアドバイスを提供する
4. 押しつけず、生徒自身が選べるように選択肢を示す
5. 最後は必ず励ましの言葉で締める

## 回答の長さ
- 300文字〜500文字程度で回答する
- 長すぎず、読みやすい分量を心がける

## 注意事項
- この会話は評価に一切影響しないことを前提に、安心して本音で話せる雰囲気を作る
- 深刻な悩み（いじめ、メンタルヘルス等）の場合は、信頼できる大人や専門家への相談を優しく勧める
"""

# Legacy prompt for backward compatibility
CHAT_PROMPT = CHAT_SYSTEM_PROMPT + """

## 生徒のメッセージ
{message}

## 回答
"""


TEACHER_ADVICE_PROMPT = """あなたは探究学習の指導を支援するAIアドバイザーです。
教師向けに、生徒への指導アドバイスを生成してください。

## 目的
- 教師が生徒に納得感のある評価説明を行うための材料を提供
- 客観的データに基づいた指導ポイントの提示

## 入力情報
- 生徒名：{student_name}
- 研究テーマ：{theme}
- 報告回数：{report_count}回
- 能力別選択回数：{ability_counts}
- 継続日数：現在{current_streak}日、最長{max_streak}日

## 出力形式（Markdown形式）
### 強み
- 2-3点

### 成長機会
- 2-3点

### 具体的な指導ポイント
- 2-3点

## 注意事項
- 否定的な表現を避け、成長の可能性として提示
- 教師が生徒に直接伝えられる形式で記述
"""


async def generate_ai_comment(
    content: str,
    abilities: List[str],
    phase_name: Optional[str],
    theme_title: str,
) -> Optional[str]:
    """Generate AI comment for a daily report."""
    if not settings.GEMINI_API_KEY:
        return None

    genai = _get_genai()
    if not genai:
        return None

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        prompt = DAILY_COMMENT_PROMPT.format(
            content=content,
            abilities=", ".join(abilities) if abilities else "未選択",
            phase=phase_name or "未選択",
            theme=theme_title,
        )

        response = await model.generate_content_async(prompt)
        return response.text.strip()

    except Exception as e:
        logger.error(f"Error generating AI comment: {e}")
        return None


async def generate_chat_response(message: str, use_rag: bool = True) -> str:
    """Generate AI principal chat response with RAG support.

    Args:
        message: User's message/question
        use_rag: Whether to use RAG with the entrepreneurship book (default: True)

    Returns:
        Generated response text
    """
    if not settings.GEMINI_API_KEY:
        return "申し訳ありません、現在AIサービスに接続できません。"

    # Use RAG-enabled response
    if use_rag:
        return await generate_rag_response(
            message=message,
            system_prompt=CHAT_SYSTEM_PROMPT,
            use_rag=True
        )

    # Fallback to non-RAG response
    genai = _get_genai()
    if not genai:
        return "申し訳ありません、現在AIサービスに接続できません。"

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        prompt = CHAT_PROMPT.format(message=message)

        response = await model.generate_content_async(prompt)
        return response.text.strip()

    except Exception as e:
        logger.error(f"Error generating chat response: {e}")
        return "申し訳ありません、今少し考えがまとまりません。もう一度質問していただけますか？"


async def generate_teacher_advice(
    student_name: str,
    theme: str,
    report_count: int,
    ability_counts: dict,
    current_streak: int,
    max_streak: int,
) -> str:
    """Generate AI advice for teachers."""
    if not settings.GEMINI_API_KEY:
        return "AIサービスに接続できません。"

    genai = _get_genai()
    if not genai:
        return "AIサービスに接続できません。"

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        # Format ability counts
        ability_counts_str = "\n".join(
            [f"  - {name}: {count}回" for name, count in ability_counts.items()]
        )

        prompt = TEACHER_ADVICE_PROMPT.format(
            student_name=student_name,
            theme=theme,
            report_count=report_count,
            ability_counts=ability_counts_str,
            current_streak=current_streak,
            max_streak=max_streak,
        )

        response = await model.generate_content_async(prompt)
        return response.text.strip()

    except Exception as e:
        logger.error(f"Error generating teacher advice: {e}")
        return "アドバイスの生成に失敗しました。"
