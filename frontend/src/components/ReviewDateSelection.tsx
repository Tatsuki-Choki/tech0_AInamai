import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import api from '../lib/api';

interface CalendarDate {
  date: string; // "2025-12-06"
  phase?: string;
}

export default function ReviewDateSelection() {
  const [dates, setDates] = useState<CalendarDate[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCalendar = async () => {
      try {
        const response = await api.get<CalendarDate[]>('/reports/calendar', {
          params: { year: currentYear, month: currentMonth }
        });
        setDates(response.data);
      } catch (error) {
        console.error('Failed to fetch calendar:', error);
      }
    };
    fetchCalendar();
  }, [currentYear, currentMonth]);

  const handleDateClick = (date: string) => {
    navigate(`/student/review/${date}`);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="bg-[#fef8f5] relative size-full min-h-screen">
      <div className="max-w-md mx-auto px-[20px] pt-[40px]">
        
        {/* ヘッダー */}
        <button 
          onClick={() => navigate('/student/menu')}
          className="flex items-center gap-1 text-[rgba(152,16,250,0.8)] font-['Zen_Maru_Gothic',sans-serif] mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>戻る</span>
        </button>

        {/* メインコンテンツ */}
        <div className="bg-white border border-[rgba(243,232,255,0.5)] rounded-[24px] shadow-lg p-6">
          
          <h1 className="text-[#59168b] text-[20px] font-bold mb-6 font-['Zen_Maru_Gothic',sans-serif]">
            日付ごとの振り返り
          </h1>

          {/* カレンダーヘッダー */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(243,232,255,0.5)]">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-purple-50 rounded-full">
              <ChevronLeft className="w-6 h-6 text-[#59168b]" />
            </button>
            
            <div className="flex items-center gap-4">
              <select 
                value={currentYear} 
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="bg-white border border-[rgba(233,212,255,0.5)] rounded-[16px] px-4 py-2 text-[#59168b] focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
              
              <select 
                value={currentMonth} 
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="bg-white border border-[rgba(233,212,255,0.5)] rounded-[16px] px-4 py-2 text-[#59168b] focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{month}月</option>
                ))}
              </select>
            </div>

            <button onClick={handleNextMonth} className="p-2 hover:bg-purple-50 rounded-full">
              <ChevronRight className="w-6 h-6 text-[#59168b]" />
            </button>
          </div>

          {/* 日付選択ラベル */}
          <p className="text-[16px] text-[rgba(110,17,176,0.8)] mb-4 font-['Zen_Maru_Gothic',sans-serif]">
            日付を選択
          </p>

          {/* 日付グリッド */}
          <div className="grid grid-cols-2 gap-4">
            {dates.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-400">
                この月に報告はありません
              </div>
            ) : (
              dates.map((item) => (
                <button
                  key={item.date}
                  onClick={() => handleDateClick(item.date)}
                  className="bg-white border-2 border-[rgba(243,232,255,0.5)] rounded-[24px] p-4 hover:border-purple-300 hover:bg-purple-50 transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <Calendar className="w-6 h-6 text-[#59168b] shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-[#59168b] text-[16px] font-bold mb-1">
                        {new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </p>
                      {item.phase && (
                        <p className="text-[rgba(173,70,255,0.7)] text-[14px]">
                          {item.phase}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

