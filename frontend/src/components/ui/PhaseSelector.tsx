import React from 'react';
import { Check } from 'lucide-react';

export interface ResearchPhase {
  id: string;
  name: string;
  display_order: number;
}

interface PhaseSelectorProps {
  phases: ResearchPhase[];
  selectedPhaseId: string;
  suggestedPhaseId?: string;
  onSelect: (phaseId: string) => void;
}

export default function PhaseSelector({
  phases,
  selectedPhaseId,
  suggestedPhaseId,
  onSelect,
}: PhaseSelectorProps) {
  // マスタデータの並び順で表示
  const sortedPhases = [...phases].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3">
        {sortedPhases.map((phase) => {
          const isSelected = phase.id === selectedPhaseId;
          const isSuggested = phase.id === suggestedPhaseId;

          return (
            <button
              key={phase.id}
              onClick={() => onSelect(phase.id)}
              className={`
                relative p-4 rounded-[16px] border-2 transition-all duration-200 text-left h-full flex flex-col justify-between min-h-[80px]
                ${isSelected 
                  ? 'border-[#9810fa] bg-[#fbf5ff]' 
                  : 'border-[rgba(243,232,255,0.8)] bg-white hover:border-[#e9d4ff]'
                }
              `}
            >
              {/* AI推奨バッジ */}
              {isSuggested && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#a3b3ff] to-[#7c86ff] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                  AI推奨
                </div>
              )}

              {/* 選択中のチェックマーク */}
              {isSelected && (
                <div className="absolute top-2 right-2 text-[#9810fa]">
                  <Check className="w-4 h-4" />
                </div>
              )}

              <span className={`
                font-['Zen_Maru_Gothic',sans-serif] font-bold text-[14px] leading-tight
                ${isSelected ? 'text-[#59168b]' : 'text-[#333333]'}
              `}>
                {phase.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
