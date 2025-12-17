import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading, Text } from '../../components/ui/Typography';
import api from '../../lib/api';
import { clearAuth } from '../../lib/auth';
import ashiatoBlue from '../../assets/figma/ashiato_blue.webp';
import owlCharacter from '../../assets/figma/owl_character.webp';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showTestLogin, setShowTestLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [testLoginLoading, setTestLoginLoading] = useState(false);

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
      // Stay on this page to show error
      // navigate(`/login?error=${encodeURIComponent(msg)}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoginLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const token = res.data.access_token;
      const user = res.data.user;

      if (token && user) {
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Redirect based on role
        if (user.role === 'teacher' || user.role === 'admin') {
          navigate('/teacher/menu');
        } else {
          navigate('/student/menu');
        }
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
    } finally {
      setTestLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-zen-maru relative overflow-hidden">
      <div className="w-full max-w-[400px] bg-[#fff9f5] rounded-[40px] p-8 pb-12 shadow-sm relative z-10 flex flex-col items-center min-h-[750px] border border-[#fff4ed]">
        {/* Header */}
        <div className="w-full mt-16 mb-12 pl-2 relative">
          <Heading level={1} className="text-[2.75rem] text-brand-primary font-normal tracking-widest mb-6 leading-tight text-center">
            あしあと
          </Heading>

          <div className="text-brand-primary text-lg leading-loose tracking-widest pl-1 font-medium text-center">
            <p className="mb-2">今日の探究が、</p>
            <p>将来の ”あしあと” になる。</p>
          </div>

          {/* Footprints Decoration */}
          <div className="absolute top-[-20px] right-[-20px] w-full h-full pointer-events-none opacity-90">
            {/* Large Footprints */}
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[-10px] top-[80px] w-[35px] opacity-80 rotate-[15deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[15px] top-[140px] w-[35px] opacity-80 rotate-[350deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[5px] top-[210px] w-[35px] opacity-80 rotate-[-10deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[30px] top-[280px] w-[35px] opacity-80 rotate-[-30deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[10px] top-[350px] w-[35px] opacity-80 rotate-[-15deg]"
            />

            {/* Small scattered footprints */}
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[45px] top-[410px] w-[25px] opacity-60 rotate-[10deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[20px] top-[460px] w-[25px] opacity-60 rotate-[-20deg]"
            />
            <img
              src={ashiatoBlue}
              alt=""
              className="absolute right-[35px] top-[510px] w-[25px] opacity-60 rotate-[5deg]"
            />
          </div>
        </div>

        {/* Owl Character Illustration */}
        <img
          src={owlCharacter}
          alt="AIナマイ"
          className="w-32 h-auto object-contain opacity-90 -mb-4 z-10"
        />

        {/* Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full h-[87px] bg-brand-primary rounded-[24px] flex items-center justify-center relative shadow-md hover:opacity-90 transition-opacity mt-auto mb-8 disabled:opacity-60"
        >
          <span className="text-xl text-white font-bold tracking-widest">生徒ログインはこちら</span>
        </button>

        {/* Teacher Link (Optional - keeping consistent with previous, but subtle) */}
        <button
          type="button"
          onClick={() => navigate('/teacher/login')}
          className="text-brand-primary text-sm font-medium border-b border-brand-primary pb-0.5 hover:opacity-70 transition-opacity mb-8"
        >
          教師の方はこちらから
        </button>

        {/* Test User Login Toggle */}
        <div className="w-full">
          <button
            onClick={() => setShowTestLogin(!showTestLogin)}
            className="text-xs text-gray-400 underline w-full text-center mb-4"
          >
            テストユーザーログインはこちら
          </button>

          {showTestLogin && (
            <form onSubmit={handleTestLogin} className="flex flex-col gap-3 bg-white/50 p-4 rounded-xl border border-brand-primary/20">
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 text-sm"
                required
              />
              <input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 text-sm"
                required
              />
              <button
                type="submit"
                disabled={testLoginLoading}
                className="bg-gray-700 text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
              >
                {testLoginLoading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 w-full">
            <Text className="text-red-600 text-sm text-center break-words">{error}</Text>
          </div>
        )}
      </div>
    </div>
  );
}
