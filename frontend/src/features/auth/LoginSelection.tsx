import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heading } from '../../components/ui/Typography';
import ashiatoBlue from '../../assets/figma/ashiato_blue.webp';
import owlCharacter from '../../assets/figma/owl_character.webp';
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 font-zen-maru relative overflow-hidden">
      {/* Background decorations - optional subtle blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-brand-buttons/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[400px] flex flex-col items-center z-10 space-y-12">
        {/* Title Section */}
        <div className="text-center space-y-4">
          <Heading level={1} className="text-3xl text-brand-primary tracking-wider mb-2">
            探究学習ログ
          </Heading>

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

        {/* Owl Character Illustration */}
        <img
          src={owlCharacter}
          alt="AIナマイ"
          className="w-32 h-auto object-contain opacity-90 -mb-4 z-10"
        />

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

