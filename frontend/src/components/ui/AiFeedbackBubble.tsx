import React from 'react';

const imgAiAvatar = "/assets/ff72433a18795fbe8154f413cbac332dae84e27b.png";

interface AiFeedbackBubbleProps {
  comment: string;
}

export default function AiFeedbackBubble({ comment }: AiFeedbackBubbleProps) {
  return (
    <div className="flex gap-3 mb-6 w-full">
      {/* アバターエリア */}
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div className="w-[64px] h-[64px] rounded-full overflow-hidden bg-white border border-purple-100 shadow-sm p-1">
          <img 
            src={imgAiAvatar} 
            alt="AI" 
            className="object-contain w-full h-full rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/64x64/purple/white?text=AI';
            }}
          />
        </div>
        <span className="text-[10px] text-[rgba(152,16,250,0.7)] font-bold font-['Zen_Maru_Gothic',sans-serif]">
          生意君
        </span>
      </div>

      {/* 吹き出しエリア */}
      <div className="flex-1 relative">
        <div className="bg-white border border-[rgba(198,210,255,0.5)] rounded-[20px] rounded-tl-[4px] p-4 shadow-[0px_2px_8px_rgba(0,0,0,0.05)]">
          <p className="text-[#59168b] text-[14px] leading-relaxed font-['Zen_Maru_Gothic',sans-serif] whitespace-pre-wrap">
            {comment}
          </p>
        </div>
      </div>
    </div>
  );
}
