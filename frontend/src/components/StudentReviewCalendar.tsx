import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ReportSummary {
  id: string;
  reported_at: string;
  content: string;
  phase?: {
    id: string;
    name: string;
  };
}

const imgAiAvatar = "/assets/ff72433a18795fbe8154f413cbac332dae84e27b.png";
const imgBubble = "/assets/14ce80fda9a62b69285eb6835c5c005c4790d027.png";

export default function StudentReviewCalendar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [currentDate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      // 月初のレポートから月末までを取得するロジックが必要だが、
      // 現在のAPIはページネーション形式なので、とりあえず最新20件を取得してクライアント側でフィルタリング
      // TODO: 月指定で取得できるAPIを追加実装するのが望ましい
      const response = await api.get<ReportSummary[]>('/reports', {
        params: { limit: 100 } // 一旦多めに取得
      });
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 曜日ヘッダー
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // 日付に対応するレポートを取得
  const getReportForDate = (date: Date) => {
    return reports.find(r => isSameDay(parseISO(r.reported_at), date));
  };

  return (
    <div className="bg-[#fef8f5] min-h-screen pb-20 relative">
      <div className="max-w-md mx-auto px-[20px] pt-[40px]">
        
        {/* ヘッダー */}
        <div className="relative flex items-center justify-center mb-8">
          <button
            onClick={() => navigate('/student/menu')}
            className="absolute left-0 text-[rgba(152,16,250,0.8)] flex items-center gap-1 font-['Zen_Maru_Gothic',sans-serif]"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-[14px]">メニュー</span>
          </button>
          <h1 className="text-[#59168b] text-[18px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
            活動の振り返り
          </h1>
        </div>

        {/* AIメッセージエリア */}
        <div className="flex gap-4 mb-8">
          <div className="w-[60px] h-[60px] shrink-0 rounded-full bg-white border border-purple-100 p-1">
            <img src={imgAiAvatar} alt="AI" className="w-full h-full object-contain rounded-full" />
          </div>
          <div className="flex-1 relative bg-white rounded-[20px] rounded-tl-[4px] p-4 shadow-sm border border-[rgba(198,210,255,0.5)]">
            <p className="text-[#59168b] text-[13px] leading-relaxed font-['Zen_Maru_Gothic',sans-serif]">
              今月もよく頑張っているね！<br/>
              過去の活動を振り返って、新しい気づきを見つけよう。
            </p>
          </div>
        </div>

        {/* カレンダーコンテナ */}
        <div className="bg-white rounded-[24px] shadow-sm border border-[rgba(243,232,255,0.5)] p-6">
          
          {/* 月ナビゲーション */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={prevMonth}
              className="p-2 text-[#9810fa] hover:bg-purple-50 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-[#59168b] text-[18px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
              {format(currentDate, 'yyyy年 M月', { locale: ja })}
            </h2>
            <button 
              onClick={nextMonth}
              className="p-2 text-[#9810fa] hover:bg-purple-50 rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-y-4 mb-2">
            {/* 曜日 */}
            {weekDays.map((day, index) => (
              <div key={day} className={`text-center text-[12px] font-bold ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {day}
              </div>
            ))}

            {/* 空白セル（月初のパディング） */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* 日付セル */}
            {calendarDays.map((date) => {
              const report = getReportForDate(date);
              const isTodayDate = isToday(date);
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => report && navigate(`/student/review/${report.id}`)}
                  disabled={!report}
                  className={`
                    flex flex-col items-center justify-start h-[50px] relative group
                    ${report ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <span className={`
                    text-[14px] font-['Zen_Maru_Gothic',sans-serif] w-8 h-8 flex items-center justify-center rounded-full mb-1 transition-colors
                    ${isTodayDate 
                      ? 'bg-[#9810fa] text-white font-bold' 
                      : report 
                        ? 'text-[#59168b] font-bold group-hover:bg-purple-50' 
                        : 'text-gray-300'
                    }
                  `}>
                    {format(date, 'd')}
                  </span>
                  
                  {/* 報告ありマーカー（カモメアイコンの代わり） */}
                  {report && (
                    <div className="w-full flex justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#ff9eaf]"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* 凡例 */}
        <div className="mt-6 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff9eaf]"></div>
            <span className="text-[12px] text-gray-500">活動記録あり</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#9810fa]"></div>
            <span className="text-[12px] text-gray-500">今日</span>
          </div>
        </div>

      </div>
    </div>
  );
}
