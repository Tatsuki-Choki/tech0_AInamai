import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Edit, Send } from 'lucide-react';
import api from '../lib/api';

const imgAiAvatar = "/assets/ff72433a18795fbe8154f413cbac332dae84e27b.png";
const imgBubble = "/assets/14ce80fda9a62b69285eb6835c5c005c4790d027.png";

interface AnalysisResult {
  suggested_phase: string;
  suggested_phase_id: string;
  suggested_abilities: { id: string; name: string; score: number; description?: string }[];
  ai_comment: string;
}

export default function ReportAnalysisScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { content, themeId } = location.state as { content: string; themeId: string } || { content: '', themeId: '' };

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!content || !themeId) {
      navigate('/student/report');
      return;
    }

    const analyzeReport = async () => {
      try {
        setIsLoading(true);
        // AI分析APIの呼び出し
        const response = await api.post('/reports/analyze', { content });
        setAnalysis(response.data);
      } catch (error) {
        console.error('Analysis failed:', error);
        alert('AI分析に失敗しました。もう一度お試しください。');
        navigate('/student/report');
      } finally {
        setIsLoading(false);
      }
    };

    analyzeReport();
  }, [content, navigate]);

  const handleSubmit = async () => {
    if (!analysis || !themeId) return;

    try {
      setIsSubmitting(true);
      // 報告データの保存
      await api.post('/reports', {
        content,
        theme_id: themeId,
        phase_id: analysis.suggested_phase_id,
        ability_ids: analysis.suggested_abilities.map(a => a.id),
      });
      navigate('/student/report/complete');
    } catch (error) {
      console.error('Submit failed:', error);
      alert('送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fef8f5] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59168b]"></div>
        <p className="text-[#59168b] font-['Zen_Maru_Gothic',sans-serif]">AIが分析中...</p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-[#fef8f5] relative size-full min-h-screen pb-8">
      <div className="max-w-md mx-auto px-[20px] pt-[40px]">

        {/* ヘッダー */}
        <button
          onClick={() => navigate('/student/report')}
          className="flex items-center gap-1 text-[rgba(152,16,250,0.8)] font-['Zen_Maru_Gothic',sans-serif] mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>戻る</span>
        </button>

        {/* アンプくんからのメッセージ */}
        <div className="flex gap-4 mb-6">
          <div className="w-[98px] shrink-0 flex flex-col items-center gap-2">
            <span className="text-[12px] text-[rgba(152,16,250,0.7)]">アンプくん</span>
            <div className="w-[80px] h-[80px]">
              <img src={imgAiAvatar} alt="AI" className="object-contain w-full h-full" />
            </div>
          </div>
          <div className="flex-1 bg-white border border-[rgba(198,210,255,0.5)] rounded-[24px] rounded-tl-[18px] p-4 shadow-sm">
            <p className="text-[#59168b] text-[14px] leading-relaxed font-['Zen_Maru_Gothic',sans-serif]">
              {analysis.ai_comment}
            </p>
          </div>
        </div>

        {/* 分析結果ラベル */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-[#8200db] rounded-full"></div>
          <span className="text-[#8200db] text-[14px] font-bold">アンプくん 分析結果</span>
        </div>

        {/* フェーズカード */}
        <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] p-6 shadow-md mb-6">
          <h2 className="text-[#59168b] text-[16px] font-bold mb-4">探究学習のフェーズ</h2>
          <div className="bg-gradient-to-r from-[rgba(163,179,255,0.3)] to-[rgba(124,134,255,0.3)] border border-[#a3b3ff] rounded-[24px] py-3 px-6 inline-block relative">
            <span className="text-[#59168b] font-bold">{analysis.suggested_phase}</span>
            <img src={imgBubble} alt="" className="absolute -top-4 -right-4 w-12 h-12 opacity-50" />
          </div>
        </div>

        {/* 能力カード */}
        <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] p-6 shadow-md mb-6">
          <h2 className="text-[#59168b] text-[16px] font-bold mb-4">発揮された能力</h2>
          <div className="flex flex-col gap-4">
            {analysis.suggested_abilities.map((ability) => (
              <div key={ability.id} className="relative">
                <div className="absolute -top-2 left-0 bg-gradient-to-r from-[#ff637e] to-[#ff2056] text-white text-[10px] px-2 py-0.5 rounded-full">
                  {ability.score >= 80 ? '強く発揮' : '発揮'}
                </div>
                <div className="border border-[#ffa1ad] rounded-[24px] p-4 mt-2 text-center bg-[#fff5f7]">
                  <span className="text-[#8b0836] font-bold">{ability.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 進捗内容確認 */}
        <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] p-6 shadow-md mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-[#59168b] text-[16px] font-bold">進捗内容</h2>
            <button
              onClick={() => navigate('/student/report')}
              className="flex items-center gap-1 text-[rgba(152,16,250,0.8)] text-[14px]"
            >
              <Edit className="w-4 h-4" />
              <span>編集</span>
            </button>
          </div>
          <div className="bg-[rgba(250,245,255,0.3)] border border-[rgba(243,232,255,0.5)] rounded-[16px] p-4">
            <p className="text-[#6e11b0] text-[14px]">{content}</p>
          </div>
        </div>

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-[64px] rounded-[24px] bg-gradient-to-r from-[#a3b3ff] to-[#7c86ff] flex items-center justify-center gap-3 text-white shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span className="font-bold text-[16px]">報告する</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
}
