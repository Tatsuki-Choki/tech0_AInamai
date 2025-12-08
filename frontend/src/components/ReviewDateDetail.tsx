import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import api from '../lib/api';

interface Report {
  id: string;
  student_id: string;
  content: string;
  phase?: {
    id: string;
    name: string;
  };
  selected_abilities: Array<{
    id: string;
    name: string;
  }>;
  ai_comment?: string;
  reported_at: string;
}

const imgAvatar = "/assets/14ce80fda9a62b69285eb6835c5c005c4790d027.png";

export default function ReviewDateDetail() {
  const { date } = useParams<{ date: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!date) {
      navigate('/student/review');
      return;
    }

    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<Report>(`/reports/by-date/${date}`);
        setReport(response.data);
      } catch (error) {
        console.error('Failed to fetch report:', error);
        alert('報告データの取得に失敗しました。');
        navigate('/student/review');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [date, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fef8f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59168b] mx-auto mb-4"></div>
          <p className="text-[#59168b] font-['Zen_Maru_Gothic',sans-serif]">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const displayDate = date ? new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="bg-[#fef8f5] relative size-full min-h-screen">
      <div className="max-w-md mx-auto px-[20px] pt-[20px]">
        
        {/* ヘッダー */}
        <button 
          onClick={() => navigate('/student/review')}
          className="flex items-center gap-1 text-[rgba(152,16,250,0.8)] font-['Zen_Maru_Gothic',sans-serif] mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>戻る</span>
        </button>

        {/* メインコンテンツ */}
        <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] shadow-lg p-6 mb-6">
          
          <h1 className="text-[#59168b] text-[20px] font-bold mb-6 font-['Zen_Maru_Gothic',sans-serif]">
            日付ごとの振り返り
          </h1>

          {/* 日付表示 */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-6 h-6">
              <img src={imgAvatar} alt="" className="object-contain w-full h-full" />
            </div>
            <p className="text-[#59168b] text-[24px] font-bold">{displayDate}</p>
          </div>

          {/* フェーズセクション */}
          <div className="border border-[rgba(198,210,255,0.5)] rounded-[24px] p-6 mb-6">
            <h3 className="text-[#59168b] text-[20px] font-bold mb-4">フェーズ</h3>
            <div className="grid grid-cols-2 gap-3">
              {['情報の収集', '課題の設定', '整理分析', 'まとめ・表現'].map((phase) => (
                <button
                  key={phase}
                  className={`p-3 rounded-[24px] border-2 transition-all ${
                    report.phase?.name === phase
                      ? 'bg-[rgba(24,42,211,0.6)] border-indigo-500 text-white font-bold'
                      : 'bg-white border-purple-100 text-[#8200db]'
                  }`}
                >
                  {phase}
                </button>
              ))}
            </div>
          </div>

          {/* 育成された能力セクション */}
          <div className="border border-[rgba(255,204,211,0.5)] rounded-[24px] p-6 mb-6">
            <h3 className="text-[#59168b] text-[20px] font-bold mb-4">育成された能力</h3>
            <div className="space-y-3">
              {report.selected_abilities.map((ability) => (
                <div 
                  key={ability.id}
                  className="bg-white border border-[rgba(255,204,211,0.5)] rounded-[16px] px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-4 h-4 bg-purple-300 rounded-full shrink-0"></div>
                  <span className="text-[#6e11b0] font-medium">{ability.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 報告内容セクション */}
          <div className="bg-[rgba(250,245,255,0.3)] border border-[rgba(243,232,255,0.5)] rounded-[24px] p-6">
            <h2 className="text-[#59168b] text-[20px] font-bold mb-4">報告内容</h2>
            <p className="text-[#6e11b0] text-[16px] leading-relaxed whitespace-pre-wrap">
              {report.content}
            </p>
          </div>

        </div>

        {/* アバター画像 */}
        <div className="absolute right-[20px] top-[136px] w-[98px] h-[88px] opacity-50">
          <img 
            src={imgAvatar} 
            alt="" 
            className="object-contain w-full h-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

      </div>
    </div>
  );
}

