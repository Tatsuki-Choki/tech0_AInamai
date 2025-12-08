import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import api from '../lib/api';

interface ReportFromAPI {
  id: string;
  content: string;
  phase?: string;
  abilities: string[];
  ai_comment?: string;
  reported_at: string;
}

const imgAvatar = "/assets/14ce80fda9a62b69285eb6835c5c005c4790d027.png";

export default function ReviewDateDetail() {
  const { date } = useParams<{ date: string }>();
  const [reports, setReports] = useState<ReportFromAPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!date) {
      navigate('/student/review');
      return;
    }

    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<ReportFromAPI[]>(`/reports/by-date/${date}`);
        setReports(response.data || []);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
        alert('報告データの取得に失敗しました。');
        navigate('/student/review');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
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

  if (reports.length === 0 && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fef8f5]">
        <div className="text-center">
          <p className="text-[#59168b] font-['Zen_Maru_Gothic',sans-serif] mb-4">この日の報告はありません</p>
          <button
            onClick={() => navigate('/student/review')}
            className="text-[rgba(152,16,250,0.8)] underline"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  const displayDate = date ? new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  return (
    <div className="bg-[#fef8f5] relative size-full min-h-screen pb-8">
      <div className="max-w-md mx-auto px-[20px] pt-[20px]">

        {/* ヘッダー */}
        <button
          onClick={() => navigate('/student/review')}
          className="flex items-center gap-1 text-[rgba(152,16,250,0.8)] font-['Zen_Maru_Gothic',sans-serif] mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>戻る</span>
        </button>

        {/* 日付表示 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6">
            <img src={imgAvatar} alt="" className="object-contain w-full h-full" />
          </div>
          <p className="text-[#59168b] text-[24px] font-bold">{displayDate}</p>
        </div>

        {/* 報告リスト */}
        {reports.map((report, index) => (
          <div key={report.id} className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] shadow-lg p-6 mb-6">

            {reports.length > 1 && (
              <p className="text-[rgba(152,16,250,0.6)] text-[14px] mb-4">報告 {index + 1}</p>
            )}

            {/* フェーズセクション */}
            {report.phase && (
              <div className="border border-[rgba(198,210,255,0.5)] rounded-[24px] p-4 mb-4">
                <h3 className="text-[#59168b] text-[16px] font-bold mb-2">フェーズ</h3>
                <div className="bg-[rgba(24,42,211,0.1)] border border-indigo-300 rounded-[16px] px-4 py-2 inline-block">
                  <span className="text-[#59168b] font-medium">{report.phase}</span>
                </div>
              </div>
            )}

            {/* 育成された能力セクション */}
            {report.abilities && report.abilities.length > 0 && (
              <div className="border border-[rgba(255,204,211,0.5)] rounded-[24px] p-4 mb-4">
                <h3 className="text-[#59168b] text-[16px] font-bold mb-2">育成された能力</h3>
                <div className="flex flex-wrap gap-2">
                  {report.abilities.map((ability, i) => (
                    <span
                      key={i}
                      className="bg-[#fff5f7] border border-[rgba(255,204,211,0.5)] rounded-full px-3 py-1 text-[#8b0836] text-[14px]"
                    >
                      {ability}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 報告内容セクション */}
            <div className="bg-[rgba(250,245,255,0.3)] border border-[rgba(243,232,255,0.5)] rounded-[24px] p-4 mb-4">
              <h3 className="text-[#59168b] text-[16px] font-bold mb-2">報告内容</h3>
              <p className="text-[#6e11b0] text-[14px] leading-relaxed whitespace-pre-wrap">
                {report.content}
              </p>
            </div>

            {/* AIコメント */}
            {report.ai_comment && (
              <div className="bg-[rgba(163,179,255,0.1)] border border-[rgba(163,179,255,0.3)] rounded-[24px] p-4">
                <h3 className="text-[#59168b] text-[16px] font-bold mb-2">AIからのコメント</h3>
                <p className="text-[#6e11b0] text-[14px] leading-relaxed">
                  {report.ai_comment}
                </p>
              </div>
            )}

          </div>
        ))}

      </div>
    </div>
  );
}

