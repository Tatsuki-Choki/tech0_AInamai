import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heading } from '../../components/ui/Typography';
import { User, School, LogOut } from 'lucide-react';
import ashiatoBlue from '../../assets/figma/861061d1100f325310b4685b65024555cb44d267.png';
import owlImage from '../../assets/figma/owl_character.png';
import { clearAuth, getStoredUser, isLoggedIn } from '../../lib/auth';

export default function LoginSelection() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const error = params.get('error');

  useEffect(() => {
    // already logged in -> redirect to proper home
    if (!isLoggedIn()) return;
    const u = getStoredUser();
    if (u?.role === 'teacher') navigate('/teacher/dashboard', { replace: true });
    if (u?.role === 'student') navigate('/student/menu', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-zen-maru relative overflow-hidden">
      <div className="w-full max-w-[400px] bg-[#fff9f5] rounded-[40px] p-8 pb-12 shadow-sm relative z-10 flex flex-col items-center min-h-[750px] border border-[#fff4ed]">
        
        {/* Header - StudentMenuと同じデザイン */}
        <div className="w-full mt-16 mb-12 pl-2 relative">
          <Heading level={1} className="text-[2.75rem] text-brand-primary font-normal tracking-widest mb-6 leading-tight text-center">
            あしあと
          </Heading>
          <div className="text-brand-primary text-[0.95rem] leading-7 font-medium tracking-wide text-center">
            <p>今日の探究が、</p>
            <p>将来の ”あしあと” になる。</p>
          </div>
          
          {/* Decorative Footprints (Figma asset) */}
          <img
            src={ashiatoBlue}
            alt=""
            className="absolute top-2 right-16 w-8 h-8 object-contain rotate-[324deg]"
          />
          <img
            src={ashiatoBlue}
            alt=""
            className="absolute top-16 right-8 w-7 h-7 object-contain rotate-[354deg]"
          />
          <img
            src={ashiatoBlue}
            alt=""
            className="absolute top-0 right-2 w-7 h-7 object-contain rotate-[349deg]"
          />
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-6 mb-16 px-1">
            <button 
                className="w-full h-[87px] bg-brand-primary rounded-[24px] flex items-center justify-center relative shadow-md hover:opacity-90 transition-opacity"
                onClick={() => navigate('/student/login')}
            >
                <span className="text-xl text-white font-bold tracking-widest">生徒</span>
            </button>
            
            <button 
                className="w-full h-[82px] bg-brand-primary rounded-[24px] flex items-center justify-center relative shadow-md hover:opacity-90 transition-opacity"
                onClick={() => navigate('/teacher/login')}
            >
                <span className="text-xl text-white font-bold tracking-widest">教師</span>
            </button>

            <button 
                onClick={() => {
                  clearAuth();
                  navigate('/login', { replace: true });
                }}
                className="w-full h-[55px] bg-[#c7c7cc] rounded-[24px] flex items-center justify-center gap-2 text-white text-base font-medium tracking-wide hover:bg-[#b0b0b0] transition-colors mt-8"
            >
                <LogOut className="w-5 h-5 rotate-180" />
                ログアウト
            </button>
        </div>

        {error && (
          <div className="w-full -mt-10 mb-6 px-2">
            <p className="text-sm text-red-600 text-center break-words">{decodeURIComponent(error)}</p>
          </div>
        )}

        {/* Character Icon (Bottom Right) */}
        <div className="absolute -bottom-5 -right-5 w-44 h-44 z-20 pointer-events-none flex items-end justify-end">
            <div className="relative w-full h-full">
                {/* Speech Bubble */}
                <div className="absolute top-8 right-16 bg-white border-[1.5px] border-black rounded-[50%] px-3 py-1 shadow-sm z-30 flex items-center justify-center w-12 h-8">
                    <span className="text-lg font-bold tracking-tighter -mt-1">・・・</span>
                </div>
                {/* Small circle for speech bubble */}
                <div className="absolute top-14 right-[3.5rem] w-2.5 h-2.5 bg-white border-[1.5px] border-black rounded-full z-30"></div>

                {/* Owl Image */}
                <img 
                    src={owlImage} 
                    alt="Character" 
                    className="w-full h-full object-contain object-bottom drop-shadow-md transform translate-x-2 translate-y-2"
                />
            </div>
        </div>
      </div>
    </div>
  );
}

