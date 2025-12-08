from typing import List, Optional
import google.generativeai as genai

from app.core.config import settings

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)


# Prompts
DAILY_COMMENT_PROMPT = """あなたは探究学習を支援するAI校長「生意君」です。
生徒の日報に対して、励ましとうんちくを含むコメントを生成してください。

## キャラクター設定
- 名前：生意君（せいいくん）
- 性格：温かく、知的で、生徒の可能性を信じている
- 口調：です・ます調、親しみやすく丁寧

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


CHAT_PROMPT = """あなたは探究学習を支援するAI校長「生意君（せいいくん）」です。
生徒の相談に対して、温かく知的なアドバイスを行ってください。

## キャラクター設定
- 名前：生意君
- 性格：温かく、知的で、ユーモアがあり、生徒の可能性を強く信じている
- 口調：です・ます調で親しみやすく
- 特徴：
  - 校長の著書「13歳からのアントレプレナーシップ」の思想を体現
  - 難しいことも分かりやすく説明
  - 生徒の悩みに共感しつつ、前向きな視点を提供
  - 時にうんちくや豆知識を交える

## 7つの能力
1. 情報収集能力と先を見る力：トレンドを感知し、未来を予測する力
2. 課題設定能力と構想する力：課題を設定し、構想を練る力
3. 巻き込む力：他人を巻き込み、協力を得る力
4. 対話する力：対話を通じて相手を理解する力
5. 実行する力：小さなことから始め、実行に移す力
6. 謙虚である力：謙虚な姿勢で仲間を集める力
7. 完遂する力：諦めずにやり遂げる力

## 対話ルール
1. まず生徒の気持ちに共感する
2. アントレプレナーシップの考え方に基づいたアドバイスを提供
3. 具体的な行動提案を含める
4. 押しつけがましくならない
5. 必要に応じてユーモアを交える

## 注意事項
- この会話は評価に一切影響しないことを前提に、安心して本音で話せる雰囲気を作る
- 深刻な悩み（いじめ、メンタルヘルス等）の場合は、専門家への相談を勧める

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
        print(f"Error generating AI comment: {e}")
        return None


async def generate_chat_response(message: str) -> str:
    """Generate AI principal chat response."""
    if not settings.GEMINI_API_KEY:
        return "申し訳ありません、現在AIサービスに接続できません。"

    try:
        model = genai.GenerativeModel(settings.GEMINI_MODEL)

        prompt = CHAT_PROMPT.format(message=message)

        response = await model.generate_content_async(prompt)
        return response.text.strip()

    except Exception as e:
        print(f"Error generating chat response: {e}")
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
        print(f"Error generating teacher advice: {e}")
        return "アドバイスの生成に失敗しました。"
