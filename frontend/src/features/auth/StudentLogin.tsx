import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading, Text } from '../../components/ui/Typography';
import api from '../../lib/api';
import { clearAuth } from '../../lib/auth';
import ashiatoBlue from '../../assets/figma/861061d1100f325310b4685b65024555cb44d267.png';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await api.get('/auth/google/login?role=student');
      const authUrl = (res.data as { auth_url?: string })?.auth_url;
      if (!authUrl) throw new Error('auth_url is missing');
      window.location.href = authUrl;
    } catch {
      const msg = 'Googleログインを開始できませんでした（バックエンド設定/起動状況を確認してください）';
      setError(msg);
      // failure should return to home/login
      clearAuth();
      navigate(`/login?error=${encodeURIComponent(msg)}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-zen-maru">
      <div className="w-full max-w-[420px] bg-[#fff1ec] rounded-[44px] shadow-[0_12px_28px_rgba(0,0,0,0.18)] border border-black/10 overflow-hidden">
        <div className="relative min-h-[880px] px-10 pt-20 pb-16 overflow-hidden">
          {/* Right footprints (Figma node 71:306 positions, approximate scaling to our container) */}
          <div className="pointer-events-none">
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[18px] top-[52px] w-[31px] h-[36px] rotate-[313deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[46px] top-[104px] w-[31px] h-[36px] rotate-[275deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[24px] top-[122px] w-[31px] h-[36px] rotate-[299deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[12px] top-[154px] w-[31px] h-[36px] rotate-[303deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[30px] top-[206px] w-[31px] h-[36px] rotate-[282deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[10px] top-[268px] w-[31px] h-[36px] rotate-[334deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[38px] top-[340px] w-[31px] h-[36px] rotate-[320deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[10px] top-[400px] w-[31px] h-[36px] rotate-[325deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[22px] top-[458px] w-[31px] h-[36px] rotate-[338deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[52px] top-[526px] w-[31px] h-[36px] rotate-[356deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[16px] top-[502px] w-[31px] h-[36px] rotate-[355deg]"
            />
          </div>

          {/* Title */}
          <Heading level={1} className="text-[56px] leading-none text-brand-primary font-normal tracking-[0.18em]">
            あしあと
          </Heading>

          {/* Copy */}
          <div className="mt-16 text-brand-primary text-[22px] leading-[2.6rem] tracking-[0.08em]">
            <p>今日の探究が、</p>
            <p>将来の ”あしあと” になる。</p>
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="mt-48 w-full h-[150px] bg-brand-primary text-white rounded-[44px] flex items-center justify-center text-[34px] font-semibold tracking-[0.12em] shadow-[0_10px_20px_rgba(0,0,0,0.20)] disabled:opacity-60"
          >
            生徒ログインはこちら
          </button>

          {/* Teacher link */}
          <button
            type="button"
            onClick={() => navigate('/teacher/login')}
            className="mt-44 w-full text-center text-brand-primary text-[26px] tracking-[0.10em]"
          >
            教師の方はこちらから
          </button>

          {/* Error */}
          {error && (
            <div className="mt-6">
              <Text className="text-red-600 text-sm text-center break-words">{error}</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

