import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Calendar, User, BookOpen, MessageCircle } from 'lucide-react';
import api from '../lib/api';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import AiFeedbackBubble from './ui/AiFeedbackBubble';

// 型定義
interface Ability {
  id: string;
  name: string;
}

interface Phase {
  id: string;
  name: string;
}

interface ReportDetail {
  id: string;
  content: string;
  reported_at: string;
  ai_comment: string | null;
  phase: Phase | null;
  selected_abilities: Ability[];
}

const imgAiAvatar = "/assets/ff72433a18795fbe8154f413cbac332dae84e27b.png";

export default function StudentReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;
    
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await api.get<ReportDetail>(`/reports/${reportId}`);
        setReport(response.data);
      } catch (error) {
        console.error('Failed to fetch report details:', error);
        alert('レポートの取得に失敗しました');
        navigate('/student/review');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fef8f5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59168b]"></div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="bg-[#fef8f5] min-h-screen pb-20">
      <div className="max-w-md mx-auto px-[20px] pt-[40px]">
        
        {/* ヘッダー */}
        <div className="relative flex items-center justify-center mb-6">
          <button
            onClick={() => navigate('/student/review')}
            className="absolute left-0 text-[rgba(152,16,250,0.8)] flex items-center gap-1 font-['Zen_Maru_Gothic',sans-serif]"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[14px]">戻る</span>
          </button>
          <div className="flex items-center gap-2 text-[#59168b]">
            <Calendar className="w-4 h-4" />
            <span className="text-[16px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
              {format(parseISO(report.reported_at), 'yyyy年M月d日', { locale: ja })}
            </span>
          </div>
        </div>

        {/* AIフィードバック */}
        {report.ai_comment && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#9810fa]"></div>
              <span className="text-[#8200db] text-[12px] font-bold">生意君からのコメント</span>
            </div>
            <AiFeedbackBubble comment={report.ai_comment} />
          </div>
        )}

        {/* 活動内容カード */}
        <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
            <BookOpen className="w-5 h-5 text-[#9810fa]" />
            <h2 className="text-[#59168b] text-[16px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
              活動内容
            </h2>
          </div>
          <p className="text-[#333333] text-[15px] leading-relaxed font-['Zen_Maru_Gothic',sans-serif] whitespace-pre-wrap">
            {report.content}
          </p>
        </div>

        {/* フェーズと能力 */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* フェーズ */}
          {report.phase && (
            <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[20px] p-4 shadow-sm">
              <span className="text-[12px] text-gray-400 block mb-1">探究フェーズ</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-8 bg-[#a3b3ff] rounded-full"></div>
                <span className="text-[#59168b] font-bold text-[16px]">
                  {report.phase.name}
                </span>
              </div>
            </div>
          )}

          {/* 能力 */}
          {report.selected_abilities.length > 0 && (
            <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[20px] p-4 shadow-sm">
              <span className="text-[12px] text-gray-400 block mb-2">発揮した能力</span>
              <div className="flex flex-wrap gap-2">
                {report.selected_abilities.map((ability) => (
                  <span 
                    key={ability.id}
                    className="bg-[#fff5f7] border border-[#ffa1ad] text-[#8b0836] px-3 py-1 rounded-full text-[13px] font-bold"
                  >
                    {ability.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 教師からのコメント（将来機能用プレースホルダー） */}
        {/* 
        <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-[24px] p-6 shadow-sm">
           ...
        </div> 
        */}

      </div>
    </div>
  );
}
