import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Edit2 } from 'lucide-react';
import api from '../lib/api';
import PhaseSelector from './ui/PhaseSelector';
import type { ResearchPhase } from './ui/PhaseSelector';
import AbilitySelector from './ui/AbilitySelector';
import type { Ability } from './ui/AbilitySelector';
import AiFeedbackBubble from './ui/AiFeedbackBubble';

interface AnalysisResult {
  suggested_phase: string;
  suggested_phase_id: string;
  suggested_abilities: { id: string; name: string; score: number; description?: string }[];
  ai_comment: string;
}

export default function ReportAnalysisScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { content, themeId, imageUrl } = location.state as { content: string; themeId: string; imageUrl?: string } || { content: '', themeId: '' };

  // Data State
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [phases, setPhases] = useState<ResearchPhase[]>([]);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  
  // Selection State
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [selectedAbilityIds, setSelectedAbilityIds] = useState<string[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!content || !themeId) {
      navigate('/student/report');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1. マスタデータの取得 (並列実行)
        const [phasesRes, abilitiesRes] = await Promise.all([
          api.get<ResearchPhase[]>('/master/research-phases'),
          api.get<Ability[]>('/master/abilities')
        ]);
        
        setPhases(phasesRes.data);
        setAbilities(abilitiesRes.data);

        // 2. AI分析の実行
        const analysisRes = await api.post<AnalysisResult>('/reports/analyze', { content });
        const result = analysisRes.data;
        setAnalysis(result);

        // 3. 初期選択状態の設定
        if (result.suggested_phase_id) {
          setSelectedPhaseId(result.suggested_phase_id);
        }
        
        if (result.suggested_abilities) {
          setSelectedAbilityIds(result.suggested_abilities.map(a => a.id));
        }

      } catch (error) {
        console.error('Failed to initialize analysis screen:', error);
        alert('データの取得またはAI分析に失敗しました。');
        navigate('/student/report');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [content, themeId, navigate]);

  const handleToggleAbility = (abilityId: string) => {
    setSelectedAbilityIds(prev => {
      if (prev.includes(abilityId)) {
        return prev.filter(id => id !== abilityId);
      } else {
        return [...prev, abilityId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!selectedPhaseId || !themeId) {
      alert('探究フェーズを選択してください');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await api.post('/reports', {
        content,
        theme_id: themeId,
        phase_id: selectedPhaseId,
        ability_ids: selectedAbilityIds,
        image_url: imageUrl,
      });
      
      navigate('/student/report/complete');
    } catch (error) {
      console.error('Submit failed:', error);
      alert('報告の送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fef8f5] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59168b]"></div>
        <p className="text-[#59168b] font-['Zen_Maru_Gothic',sans-serif] animate-pulse">
          生井校長が分析中...
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-[#fef8f5] min-h-screen pb-20">
      <div className="max-w-md mx-auto px-[20px] pt-[40px]">
        
        {/* ヘッダー */}
        <div className="relative flex items-center justify-center mb-8">
          <button
            onClick={() => navigate('/student/report')}
            className="absolute left-0 text-[rgba(152,16,250,0.8)] flex items-center gap-1 font-['Zen_Maru_Gothic',sans-serif]"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[14px]">戻る</span>
          </button>
          <h1 className="text-[#59168b] text-[18px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
            分析結果
          </h1>
        </div>

        {/* AIフィードバック */}
        <AiFeedbackBubble comment={analysis.ai_comment} />

        {/* コンテンツカード */}
        <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] p-6 shadow-lg flex flex-col gap-8 mb-8">
          
          {/* 探究フェーズ選択 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#9810fa]"></div>
              <h2 className="text-[#59168b] text-[16px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
                今の探究フェーズは？
              </h2>
            </div>
            <PhaseSelector
              phases={phases}
              selectedPhaseId={selectedPhaseId}
              suggestedPhaseId={analysis.suggested_phase_id}
              onSelect={setSelectedPhaseId}
            />
          </section>

          <hr className="border-[rgba(243,232,255,0.8)]" />

          {/* 能力選択 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#9810fa]"></div>
              <h2 className="text-[#59168b] text-[16px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
                発揮した能力は？
              </h2>
              <span className="text-[12px] text-gray-400 ml-auto">複数選択可</span>
            </div>
            <AbilitySelector
              abilities={abilities}
              selectedAbilityIds={selectedAbilityIds}
              suggestedAbilityIds={analysis.suggested_abilities.map(a => a.id)}
              onToggle={handleToggleAbility}
            />
          </section>

          <hr className="border-[rgba(243,232,255,0.8)]" />

          {/* 報告内容確認 */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[#59168b] text-[14px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
                報告内容
              </h2>
              <button
                onClick={() => navigate('/student/report')}
                className="text-[rgba(152,16,250,0.8)] text-[12px] flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <Edit2 className="w-3 h-3" />
                <span>編集する</span>
              </button>
            </div>
            <div className="bg-[#faf5ff] rounded-[16px] p-4 text-[14px] text-[#59168b] leading-relaxed">
              {imageUrl && (
                <div className="mb-4 rounded-[12px] overflow-hidden border border-[#e0c0ff]">
                    <img src={imageUrl} alt="Uploaded" className="w-full h-auto object-cover max-h-[200px]" />
                </div>
              )}
              {content}
            </div>
          </section>

        </div>

        {/* アクションボタン */}
        <div className="pb-8">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-[64px] rounded-[24px] bg-gradient-to-r from-[#a3b3ff] to-[#7c86ff] flex items-center justify-center gap-3 text-white shadow-lg hover:shadow-xl hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <span className="font-bold text-[16px] font-['Zen_Maru_Gothic',sans-serif]">
                  この内容で報告する
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
