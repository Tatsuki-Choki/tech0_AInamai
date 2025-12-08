import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Eraser, ArrowRight } from 'lucide-react';

const imgAvatar = "/assets/14ce80fda9a62b69285eb6835c5c005c4790d027.png";

export default function ReportScreen() {
  const [content, setContent] = useState('');
  const navigate = useNavigate();

  const handleNext = () => {
    if (!content.trim()) return;
    // 次の画面（AI分析・確認画面）へ遷移し、入力内容を渡す
    navigate('/student/report/analysis', { state: { content } });
  };

  return (
    <div className="bg-[#fef8f5] content-stretch flex flex-col items-start pb-0 pt-[24px] px-[20px] relative size-full min-h-screen">
      <div className="bg-white border border-[rgba(243,232,255,0.5)] border-solid flex flex-col gap-[32px] h-full min-h-[767px] pb-px pt-[41px] px-[20px] relative rounded-[24px] shadow-lg w-full max-w-md mx-auto">
        
        {/* ヘッダー部分 */}
        <div className="relative w-full">
          <button 
            onClick={() => navigate('/student/menu')}
            className="absolute left-0 top-0 flex items-center gap-1 text-[rgba(152,16,250,0.8)] font-['Zen_Maru_Gothic',sans-serif]"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>メニューに戻る</span>
          </button>
          
          <div className="mt-12 flex items-start gap-4">
            <div className="w-[77px] h-[69px] shrink-0">
              <img 
                alt="チャッピー生井" 
                className="object-cover w-full h-full" 
                src={imgAvatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/77x69/purple/white?text=Avatar';
                }}
              />
            </div>
            <div className="bg-white border border-[rgba(198,210,255,0.5)] rounded-tl-[18px] rounded-tr-[24px] rounded-br-[24px] rounded-bl-[24px] p-6 w-full">
              <p className="font-['Zen_Maru_Gothic',sans-serif] text-[#59168b] text-[14px] leading-relaxed">
                探求学習の進捗を教えてね
              </p>
            </div>
          </div>
          <p className="absolute top-8 left-0 text-[12px] text-[rgba(152,16,250,0.7)] font-['Zen_Maru_Gothic',sans-serif]">
            チャッピー生井
          </p>
        </div>

        {/* タイトル */}
        <div>
          <h1 className="font-['Zen_Maru_Gothic',sans-serif] text-[#59168b] text-[20px] font-bold mb-2">
            進捗報告
          </h1>
          <p className="font-['Zen_Maru_Gothic',sans-serif] text-[14px] text-[rgba(152,16,250,0.6)]">
            今日の活動内容を入力してください
          </p>
        </div>

        {/* 入力エリア */}
        <div className="flex flex-col gap-4 flex-grow">
          <div className="w-full flex-grow">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="今日の探求学習で取り組んだこと、発見したこと、考えたことなどを自由に入力してください..."
              className="w-full h-[300px] p-5 bg-white border border-[rgba(233,212,255,0.5)] rounded-[24px] resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 font-['Zen_Maru_Gothic',sans-serif] text-[16px] text-[#59168b] placeholder-[rgba(218,178,255,0.6)]"
            />
          </div>

          <div className="flex gap-4 h-[58px] mt-auto mb-8">
            <button 
              onClick={() => setContent('')}
              className="flex-1 flex items-center justify-center gap-2 bg-[rgba(250,245,255,0.5)] border border-[rgba(243,232,255,0.5)] rounded-[24px] hover:bg-purple-50 transition-colors"
            >
              <Eraser className="w-5 h-5 text-[#8200db]" />
              <span className="text-[#8200db] font-['Zen_Maru_Gothic',sans-serif]">クリア</span>
            </button>
            
            <button 
              onClick={handleNext}
              disabled={!content.trim()}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[24px] shadow-md transition-all ${
                content.trim() 
                  ? 'bg-gradient-to-r from-[#a3b3ff] to-[#7c86ff] text-white hover:opacity-90' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="font-['Zen_Maru_Gothic',sans-serif]">次へ</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

