import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heading } from '../../components/ui/Typography';
import ashiatoBlue from '../../assets/figma/ashiato_blue.webp';
import { getStoredUser, isLoggedIn } from '../../lib/auth';

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
        <div className="w-full mt-16 mb-24 pl-2 relative">
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
          <img
            src={ashiatoBlue}
            alt=""
            className="absolute top-32 right-2 w-7 h-7 object-contain rotate-[340deg]"
          />
          <img
            src={ashiatoBlue}
            alt=""
            className="absolute top-48 right-10 w-8 h-8 object-contain rotate-[330deg]"
          />
          <img
            src={ashiatoBlue}
            alt=""
            className="absolute top-64 right-6 w-9 h-9 object-contain rotate-[350deg]"
          />
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col items-center gap-6 mb-16 px-4">
          <button
            className="w-full h-[88px] bg-brand-primary rounded-[16px] flex items-center justify-center relative shadow-md hover:opacity-90 transition-opacity"
            onClick={() => navigate('/student/login')}
          >
            <span className="text-xl text-white font-bold tracking-widest">生徒ログインはこちら</span>
          </button>

          <div className="mt-8 flex flex-col items-end w-full relative h-32">
            {/* Lower Footprints */}
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute -top-4 right-2 w-7 h-7 object-contain rotate-[30deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute top-12 right-10 w-8 h-8 object-contain rotate-[10deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute top-28 right-4 w-9 h-9 object-contain rotate-[40deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute top-40 right-24 w-10 h-10 object-contain rotate-[20deg]"
            />

            <div className="absolute top-20 right-20 w-max">
              <button
                onClick={() => navigate('/teacher/login')}
                className="text-brand-primary text-base hover:underline focus:outline-none tracking-wide"
              >
                教師の方はこちらから
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="w-full -mt-10 mb-6 px-2">
            <p className="text-sm text-red-600 text-center break-words">{decodeURIComponent(error)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

