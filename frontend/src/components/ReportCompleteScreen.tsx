import { useNavigate } from 'react-router-dom';
import { CheckCircle, Home } from 'lucide-react';

const imgSuccess = "/assets/a8939bc33b9d034667ad9d4463f43536e688f710.png";

export default function ReportCompleteScreen() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="bg-[#fef8f5] content-stretch flex flex-col items-start pb-0 pt-[81.5px] px-[20px] relative size-full min-h-screen">
      <div className="bg-white border border-[rgba(243,232,255,0.5)] border-solid h-[648px] relative rounded-[24px] shadow-lg shrink-0 w-full max-w-md mx-auto flex flex-col items-center justify-center p-8">
        
        {/* 成功アイコン */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[40px] rounded-full size-[96px] bg-green-50 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>

        {/* タイトル */}
        <div className="mt-24 mb-4 text-center">
          <h1 className="text-[#59168b] text-[20px] font-bold font-['Zen_Maru_Gothic',sans-serif]">
            報告完了！
          </h1>
        </div>

        {/* 日付 */}
        <div className="mb-8 text-center">
          <p className="text-[16px] text-[rgba(152,16,250,0.6)] font-['Zen_Maru_Gothic',sans-serif]">
            {today}
          </p>
        </div>

        {/* メッセージ */}
        <div className="mb-8 w-full">
          <div className="border border-[rgba(198,210,255,0.5)] border-solid rounded-[24px] rounded-tl-[18px] p-6 bg-white">
            <div className="text-[#59168b] text-[16px] leading-relaxed font-['Zen_Maru_Gothic',sans-serif]">
              <p className="mb-2">お疲れさまでした！</p>
              <p>今日も素晴らしい探究活動ができましたね。継続的に記録することで、自分の成長が見えてきます。</p>
            </div>
          </div>
        </div>

        {/* 画像 */}
        <div className="absolute bottom-[100px] right-[40px] w-[105px] h-[110px] opacity-50">
          <img 
            src={imgSuccess} 
            alt="Success" 
            className="object-contain w-full h-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* メニューに戻るボタン */}
        <button
          onClick={() => navigate('/student/menu')}
          className="w-full h-[56px] rounded-[24px] bg-gradient-to-r from-[#a3b3ff] to-[#7c86ff] flex items-center justify-center gap-3 text-white shadow-lg hover:opacity-90 transition-opacity mt-auto"
        >
          <Home className="w-5 h-5" />
          <span className="font-bold text-[16px] font-['Zen_Maru_Gothic',sans-serif]">メニューに戻る</span>
        </button>

      </div>
    </div>
  );
}

