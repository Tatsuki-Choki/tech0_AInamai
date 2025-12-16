from typing import List, Optional, Tuple
from uuid import UUID
import asyncio
import logging

# Gemini SDK (google-generativeai) is optional; analysis should still work via heuristics if missing.
try:  # pragma: no cover
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover
    genai = None  # type: ignore
import json
import re

from app.core.config import settings
from app.services.rag import generate_rag_response

logger = logging.getLogger(__name__)

# Initialize the Gemini client
_client = None

def get_genai_client():
    """Get or create the genai client."""
    global _client
    if genai is None or not settings.GEMINI_API_KEY:
        return None
    if _client is None:
        genai.configure(api_key=settings.GEMINI_API_KEY)  # type: ignore[union-attr]
        _client = genai  # configured module acts as client holder
    return _client


ANALYZE_PROMPT = """あなたは探究学習の分析を支援するAIです。
生徒の報告内容を分析して、フェーズと発揮された能力を判定してください。

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
報告内容を読んで以下を判定してください：
1. どの探究フェーズに該当するか（1つ選択）
2. 発揮された能力（必ず3つに固定）：強く発揮された能力1つ + サブ発揮能力2つ（重複なし）

## 入力
報告内容：{content}
研究テーマ：{theme}

## 出力（JSON形式のみ、マークダウンなし）
{{
  "phase": "フェーズ名",
  "primary_ability": {{"name": "能力名", "reason": "理由"}},
  "sub_abilities": [
    {{"name": "能力名", "reason": "理由"}},
    {{"name": "能力名", "reason": "理由"}}
  ]
}}
"""


# RAGを使用した励ましコメント生成用のシステムプロンプト
COMMENT_SYSTEM_PROMPT = """あなたは「生井先生（ナマイせんせい）」という名前の、探究学習を支援する優しいAIメンターです。

## あなたの役割
- 高校生の探究学習を温かく見守り、励ます
- 生徒一人ひとりの頑張りを認め、次のステップへの意欲を高める
- 「13歳からのアントレプレナーシップ」の教えを活かした具体的なアドバイスを提供

## コメントの特徴
- 生徒の名前を使って親しみを込めて呼びかける
- 報告内容の具体的な部分を褒める（「〜したんだね」「〜に気づいたのは素晴らしい」）
- 発揮された能力を自然な形で言及する
- 次の一歩を優しく提案する
- 3〜5文程度の温かみのあるコメント
- 絵文字は使わない

## 話し方
- 敬語を使いつつも、堅すぎない柔らかい口調
- 「〜だね」「〜だよ」などの親しみやすい語尾も適度に使用
- 説教臭くならないように注意

## 書籍「13歳からのアントレプレナーシップ」の教えを参考にして、探究学習の意義や成長につながるメッセージを伝えてください。"""


COMMENT_USER_PROMPT = """以下の生徒の報告に対して、励ましのコメントを生成してください。

【生徒名】{student_name}さん
【研究テーマ】{theme}
【報告内容】
{content}

【分析結果】
- 探究フェーズ: {phase}
- 強く発揮された能力: {primary_ability}（理由: {primary_reason}）
- サブ能力1: {sub_ability1}（理由: {sub_reason1}）
- サブ能力2: {sub_ability2}（理由: {sub_reason2}）

上記を踏まえて、{student_name}さんの頑張りを認め、次の一歩への意欲を高める温かいコメントを日本語で生成してください。
書籍の教えを参考に、具体的で励みになるメッセージをお願いします。"""

ABILITY_NAMES = [
    "情報収集能力と先を見る力",
    "課題設定能力と構想する力",
    "巻き込む力",
    "対話する力",
    "実行する力",
    "謙虚である力",
    "完遂する力",
]

PHASE_NAMES = ["課題の設定", "情報の収集", "整理・分析", "まとめ・表現"]

# Ability score constants for analysis results
STRONG_ABILITY_SCORE = 80  # Score for the primary/strong ability
SUB_ABILITY_SCORE = 60     # Score for each sub ability


def _heuristic_analysis(content: str) -> Tuple[Optional[str], List[dict], str]:
    """
    AIが使えない/失敗した場合のフォールバック。
    強1（score=80）＋サブ2（score=60）を必ず返す。
    """
    text = (content or "").lower()

    def score_for(name: str) -> int:
        # Very small heuristic keyword matching (JP keywords kept as-is)
        kws = {
            "情報収集能力と先を見る力": ["調べ", "検索", "資料", "文献", "情報", "データ", "統計", "調査"],
            "課題設定能力と構想する力": ["課題", "仮説", "テーマ", "目的", "計画", "構想", "方針", "設計"],
            "巻き込む力": ["協力", "巻き込", "チーム", "仲間", "提案", "依頼", "相談", "生徒会", "承認"],
            "対話する力": ["インタビュー", "聞", "対話", "議論", "話", "質問", "フィードバック"],
            "実行する力": ["実行", "作成", "作っ", "やっ", "行動", "試し", "実施", "テスト", "作業"],
            "謙虚である力": ["反省", "学び", "気づ", "改善", "教えて", "指摘", "振り返", "フィードバック"],
            "完遂する力": ["完了", "やり遂げ", "最後まで", "継続", "仕上げ", "提出", "発表", "達成"],
        }
        hits = 0
        for kw in kws.get(name, []):
            if kw in text:
                hits += 1
        return hits

    scored = [(name, score_for(name)) for name in ABILITY_NAMES]
    scored.sort(key=lambda x: (-x[1], ABILITY_NAMES.index(x[0])))

    picked = [s[0] for s in scored if s[1] > 0][:3]
    # If insufficient, fill with fixed order
    for n in ABILITY_NAMES:
        if len(picked) >= 3:
            break
        if n not in picked:
            picked.append(n)

    abilities = [
        {"name": picked[0], "reason": "記述内容から最も強く表れているため", "role": "strong", "score": STRONG_ABILITY_SCORE},
        {"name": picked[1], "reason": "行動や思考の過程から確認できるため", "role": "sub", "score": SUB_ABILITY_SCORE},
        {"name": picked[2], "reason": "取り組みの補助的な要素として見られるため", "role": "sub", "score": SUB_ABILITY_SCORE},
    ]

    # Phase heuristic
    phase = None
    if any(k in text for k in ["課題", "目的", "仮説", "テーマ"]):
        phase = "課題の設定"
    if any(k in text for k in ["調べ", "検索", "資料", "文献", "インタビュー", "アンケート", "データ"]):
        phase = "情報の収集"
    if any(k in text for k in ["整理", "分析", "比較", "まとめ", "表", "グラフ", "マップ"]):
        phase = "整理・分析"
    if any(k in text for k in ["発表", "スライド", "資料", "ポスター", "表現", "まとめた"]):
        phase = "まとめ・表現"

    # フォールバック時のコメントも能力に基づいて生成
    primary_name = abilities[0]["name"] if abilities else "探究する力"
    comment = f"報告ありがとうございます。今回の取り組みでは特に「{primary_name}」を発揮していますね。小さな一歩でも、積み重ねることで大きな成長につながります。次のステップも楽しみにしています！"
    return phase, abilities, comment


async def _generate_encouraging_comment(
    content: str,
    theme_title: str,
    student_name: str,
    phase: str,
    primary_ability: dict,
    sub_abilities: List[dict],
) -> str:
    """RAGを使用して励ましコメントを生成する."""
    try:
        # コメント生成用のプロンプトを作成
        user_prompt = COMMENT_USER_PROMPT.format(
            student_name=student_name,
            theme=theme_title or "未設定",
            content=content,
            phase=phase or "未判定",
            primary_ability=primary_ability.get("name", "未判定") if primary_ability else "未判定",
            primary_reason=primary_ability.get("reason", "") if primary_ability else "",
            sub_ability1=sub_abilities[0].get("name", "未判定") if len(sub_abilities) > 0 else "未判定",
            sub_reason1=sub_abilities[0].get("reason", "") if len(sub_abilities) > 0 else "",
            sub_ability2=sub_abilities[1].get("name", "未判定") if len(sub_abilities) > 1 else "未判定",
            sub_reason2=sub_abilities[1].get("reason", "") if len(sub_abilities) > 1 else "",
        )

        # RAGサービスを使用してコメント生成（書籍の内容を参照）
        comment = await generate_rag_response(
            message=user_prompt,
            system_prompt=COMMENT_SYSTEM_PROMPT,
            use_rag=True,
        )

        # コメントが空または短すぎる場合はフォールバック
        if not comment or len(comment) < 20:
            return f"{student_name}さん、報告ありがとうございます。{phase or '探究活動'}の段階で、{primary_ability.get('name', '能力') if primary_ability else '様々な能力'}を発揮していますね。この調子で頑張りましょう！"

        return comment

    except Exception as e:
        logger.warning(f"Error generating encouraging comment: {e}")
        # フォールバックメッセージ
        return f"{student_name}さん、報告ありがとうございます。着実に探究を進めていますね。次のステップも楽しみにしています！"


async def analyze_report_content(
    content: str,
    theme_title: Optional[str] = None,
    student_name: Optional[str] = None,
) -> Tuple[Optional[str], List[dict], str]:
    """
    報告内容をAIで分析し、フェーズと能力を提案する。
    その後、RAGを使用して励ましコメントを生成。

    Args:
        content: 報告内容
        theme_title: 研究テーマ
        student_name: 生徒名（苗字）

    Returns:
        Tuple of (suggested_phase, abilities_list, ai_comment)
    """
    # If SDK or API key is missing, fall back to heuristics (AI is optional)
    if genai is None or not settings.GEMINI_API_KEY:
        return _heuristic_analysis(content)

    # 生徒名から苗字を抽出（スペースや全角スペースで分割して最初の部分を取得）
    if student_name:
        surname = student_name.split()[0] if ' ' in student_name else student_name.split('　')[0] if '　' in student_name else student_name
    else:
        surname = "生徒"

    response_text = ""
    try:
        client = get_genai_client()
        if not client:
            return _heuristic_analysis(content)

        # Step 1: 分析（フェーズと能力の判定）
        prompt = ANALYZE_PROMPT.format(
            content=content,
            theme=theme_title or "未設定",
        )

        model_name = settings.GEMINI_MODEL or "gemini-2.0-flash"
        model = genai.GenerativeModel(model_name)  # type: ignore[union-attr]
        timeout_s = getattr(settings, "GEMINI_TIMEOUT_SECONDS", 8)

        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(model.generate_content, prompt),
                timeout=timeout_s,
            )
        except Exception as e:
            logger.warning(f"Analysis timeout or error: {e}")
            return _heuristic_analysis(content)

        response_text = (getattr(response, "text", "") or "").strip()

        # マークダウンのコードブロックを除去
        if response_text.startswith("```"):
            response_text = re.sub(r'^```json?\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)

        # JSONをパース
        result = json.loads(response_text)

        phase = result.get("phase")
        abilities: List[dict] = []

        # New format (preferred): 1 strong + 2 sub
        primary = result.get("primary_ability")
        subs = result.get("sub_abilities", [])
        if isinstance(primary, dict) and isinstance(subs, list) and len(subs) >= 2:
            abilities = [
                {"name": primary.get("name"), "reason": primary.get("reason"), "role": "strong", "score": STRONG_ABILITY_SCORE},
                {"name": subs[0].get("name"), "reason": subs[0].get("reason"), "role": "sub", "score": SUB_ABILITY_SCORE},
                {"name": subs[1].get("name"), "reason": subs[1].get("reason"), "role": "sub", "score": SUB_ABILITY_SCORE},
            ]
        else:
            # Backward-compatible: old format list -> take first 3 deterministically
            old = result.get("abilities", [])
            if isinstance(old, list):
                trimmed = old[:3]
                for i, ab in enumerate(trimmed):
                    if not isinstance(ab, dict):
                        continue
                    abilities.append({
                        "name": ab.get("name"),
                        "reason": ab.get("reason"),
                        "role": "strong" if i == 0 else "sub",
                        "score": STRONG_ABILITY_SCORE if i == 0 else SUB_ABILITY_SCORE,
                    })

        # Step 2: RAGを使用して励ましコメントを生成
        primary_ability = abilities[0] if abilities else None
        sub_abilities = abilities[1:3] if len(abilities) > 1 else []

        comment = await _generate_encouraging_comment(
            content=content,
            theme_title=theme_title or "未設定",
            student_name=surname,
            phase=phase or "探究活動",
            primary_ability=primary_ability,
            sub_abilities=sub_abilities,
        )

        return phase, abilities, comment

    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {e}, response: {response_text}")
        return _heuristic_analysis(content)
    except Exception as e:
        logger.exception(f"Error analyzing report: {e}")
        return _heuristic_analysis(content)


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
