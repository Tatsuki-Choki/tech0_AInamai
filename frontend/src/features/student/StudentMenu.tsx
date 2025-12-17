import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading } from '../../components/ui/Typography';
import { LogOut } from 'lucide-react';
import owlImage from '../../assets/figma/owl_character.webp';
import { clearAuth } from '../../lib/auth';
import AIChatModal from '../../components/chat/AIChatModal';

export default function StudentMenu() {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const footprintLarge = new URL('../../assets/figma/ashiato_white.webp', import.meta.url).href;
  const footprintSmall1 = new URL('../../assets/figma/ashiato_white 3.png', import.meta.url).href;
  const footprintSmall2 = new URL('../../assets/figma/ashiato_white 4-1.png', import.meta.url).href;
  const magnifier = new URL('../../assets/figma/magnifier.webp', import.meta.url).href;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-zen-maru relative overflow-hidden">
      {/* 外枠のボーダーを追加してカード感を強調 */}
      <div className="w-full max-w-[400px] bg-[#fff9f5] rounded-[40px] p-8 pb-12 shadow-sm relative z-10 flex flex-col items-center min-h-[750px] border border-[#fff4ed]">

        {/* Header - 左揃え */}
        <div className="w-full mt-16 mb-12 pl-2">
          <Heading level={1} className="text-[2.75rem] text-brand-primary font-normal tracking-widest mb-6 leading-tight">
            あしあと
          </Heading>
          <div className="text-brand-primary text-[0.95rem] leading-7 font-medium tracking-wide">
            <p>今日の探究が、</p>
            <p>将来の ”あしあと” になる。</p>
          </div>
        </div>

        {/* Main Actions */}
        <div className="w-full flex flex-col gap-8 mb-16 px-1">
          {/* Report Button */}
          <button
            className="w-full h-36 bg-brand-primary rounded-[32px] flex items-center justify-between pl-12 pr-8 shadow-md hover:opacity-90 transition-opacity relative overflow-hidden group"
            onClick={() => navigate('/student/report')}
          >
            <span className="text-4xl text-white font-normal tracking-[0.2em] z-10">報告</span>
            <div className="relative z-10 w-24 h-24 translate-x-1 translate-y-2">
              <img
                src={footprintLarge}
                alt=""
                className="absolute right-0 top-3 w-10 h-10 object-contain rotate-[12deg]"
              />
              <img
                src={footprintSmall1}
                alt=""
                className="absolute right-6 top-0 w-7 h-7 object-contain rotate-[-8deg]"
              />
              <img
                src={footprintSmall2}
                alt=""
                className="absolute right-2 top-7 w-7 h-7 object-contain rotate-[22deg]"
              />
            </div>
          </button>

          {/* Review Button */}
          <button
            className="w-full h-36 bg-brand-buttons rounded-[32px] flex items-center justify-between pl-10 pr-10 shadow-md hover:opacity-90 transition-opacity relative overflow-hidden"
            onClick={() => navigate('/student/calendar')}
          >
            <span className="text-[2rem] text-white font-normal tracking-widest z-10 whitespace-nowrap">振り返り</span>
            <div className="relative z-10 transform translate-x-1">
              <img src={magnifier} alt="" className="w-16 h-16 object-contain" />
            </div>
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            clearAuth();
            navigate('/login');
          }}
          className="w-full h-16 bg-[#c4c4c4] rounded-full flex items-center justify-center gap-2 text-white text-lg font-normal tracking-wider hover:bg-[#b0b0b0] transition-colors mb-8"
        >
          <LogOut className="w-5 h-5 rotate-180 mb-0.5" />
          ログアウト
        </button>

      </div>

      {/* Floating Chat Button (Fixed Position) */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-32 h-32 z-50 flex items-end justify-end cursor-pointer hover:scale-105 transition-transform focus:outline-none"
        aria-label="AIチャットを開く"
      >
        <div className="relative w-full h-full">
          {/* Speech Bubble */}
          <div className="absolute top-4 right-10 bg-white border-[1.5px] border-black rounded-[50%] px-3 py-1 shadow-sm z-30 flex items-center justify-center w-12 h-8 animate-bounce-gentle">
            <span className="text-[10px] font-bold text-brand-primary leading-tight">相談</span>
          </div>
          {/* Small circle for speech bubble */}
          <div className="absolute top-[2.8rem] right-[2.2rem] w-2 h-2 bg-white border-[1.5px] border-black rounded-full z-30"></div>

          {/* Owl Image */}
          <img
            src={owlImage}
            alt="AIナマイ - クリックして相談"
            className="w-full h-full object-contain object-bottom drop-shadow-md"
          />
        </div>
      </button>

      {/* AI Chat Modal */}
      <AIChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
