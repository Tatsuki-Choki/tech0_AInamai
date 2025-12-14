import React from 'react';
import { Check } from 'lucide-react';

export interface Ability {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface AbilitySelectorProps {
  abilities: Ability[];
  selectedAbilityIds: string[];
  suggestedAbilityIds: string[]; // AIが提案した能力IDリスト
  onToggle: (abilityId: string) => void;
}

export default function AbilitySelector({
  abilities,
  selectedAbilityIds,
  suggestedAbilityIds,
  onToggle,
}: AbilitySelectorProps) {
  const sortedAbilities = [...abilities].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3">
        {sortedAbilities.map((ability) => {
          const isSelected = selectedAbilityIds.includes(ability.id);
          const isSuggested = suggestedAbilityIds.includes(ability.id);

          return (
            <button
              key={ability.id}
              onClick={() => onToggle(ability.id)}
              className={`
                relative w-full p-4 rounded-[16px] border transition-all duration-200 text-left flex items-center justify-between group
                ${isSelected
                  ? 'bg-[#fff5f7] border-[#ffa1ad] shadow-sm'
                  : 'bg-white border-[rgba(243,232,255,0.8)] hover:border-[#ffa1ad]/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* チェックボックス風の表示 */}
                <div className={`
                  w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                  ${isSelected
                    ? 'bg-[#ff637e] border-[#ff637e]'
                    : 'bg-white border-gray-300 group-hover:border-[#ff637e]/50'
                  }
                `}>
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>

                <div className="flex flex-col">
                  <span className={`
                    font-['Zen_Maru_Gothic',sans-serif] font-bold text-[15px]
                    ${isSelected ? 'text-[#8b0836]' : 'text-[#333333]'}
                  `}>
                    {ability.name}
                  </span>
                </div>
              </div>

              {/* AI推奨バッジ */}
              {isSuggested && (
                <div className="bg-gradient-to-r from-[#ff637e] to-[#ff2056] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ml-2 shrink-0">
                  AI推奨
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
