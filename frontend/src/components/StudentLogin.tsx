import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// GoogleロゴのSVGコンポーネント
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
      <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
      <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
      <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
      <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
    </g>
  </svg>
);

export default function StudentLogin() {
  const navigate = useNavigate();
  const [googleLoginUrl, setGoogleLoginUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // テストログイン用の状態
  const [showTestLogin, setShowTestLogin] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testLoginLoading, setTestLoginLoading] = useState(false);

  useEffect(() => {
    const fetchLoginUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        // 生徒用ログインなので role=student を渡す
        const response = await api.get('/auth/google/login?role=student');
        const authUrl = response.data.auth_url;
        
        // Google OAuth設定が不完全な場合のチェック
        if (authUrl.includes('your-google-client-id')) {
          setError('Google OAuthの設定が完了していません。管理者に連絡してください。');
          setGoogleLoginUrl('');
        } else {
          setGoogleLoginUrl(authUrl);
        }
      } catch (error: any) {
        console.error('Login URL fetch error:', error);
        const errorMessage = error.response?.data?.detail || error.message || 'ログインURLの取得に失敗しました';
        setError(errorMessage);
        setGoogleLoginUrl('');
      } finally {
        setLoading(false);
      }
    };
    fetchLoginUrl();
  }, []);

  const handleLogin = () => {
    if (googleLoginUrl) {
      window.location.href = googleLoginUrl;
    } else {
      setError('ログインURLが取得できませんでした。ページを再読み込みしてください。');
    }
  };

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTestLoginLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: testEmail,
        password: testPassword,
      });

      // トークンとユーザー情報を保存
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // 生徒用メニューへリダイレクト
      navigate('/student/menu');
    } catch (error: any) {
      console.error('Test login error:', error);
      const errorMessage = error.response?.data?.detail || 'ログインに失敗しました';
      setError(errorMessage);
    } finally {
      setTestLoginLoading(false);
    }
  };

  return (
    <div className="bg-[#fef8f5] content-stretch flex flex-col items-start pb-0 pt-[48.5px] px-[20px] relative size-full min-h-screen">
      <div className="bg-white border border-[rgba(243,232,255,0.5)] border-solid content-stretch flex flex-col gap-[8px] min-h-[714px] items-center justify-center pb-8 pt-[25px] px-[25px] relative rounded-[24px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] shrink-0 w-full max-w-md mx-auto mt-10">

        <div className="flex flex-col items-center gap-6 w-full px-8">
          <p className="font-['Zen_Maru_Gothic',sans-serif] text-[20px] text-[#59168b] text-center font-bold">
            探究学習日記
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-3 bg-gray-100 border border-gray-300 rounded-full px-6 py-3 w-full max-w-xs">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              <span className="font-medium text-gray-600">読み込み中...</span>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={!googleLoginUrl}
              className={`flex items-center justify-center gap-3 border rounded-full px-6 py-3 shadow-md transition-colors w-full max-w-xs ${
                googleLoginUrl
                  ? 'bg-white border-gray-300 hover:bg-gray-50'
                  : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
              }`}
            >
              <GoogleIcon />
              <span className="font-medium text-gray-700">Googleでログイン</span>
            </button>
          )}

          {/* テストアカウントログイン */}
          <div className="w-full max-w-xs">
            <button
              onClick={() => setShowTestLogin(!showTestLogin)}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors w-full text-center"
            >
              {showTestLogin ? 'テストログインを閉じる' : 'テストアカウントでログイン'}
            </button>

            {showTestLogin && (
              <form onSubmit={handleTestLogin} className="mt-4 space-y-3">
                <div>
                  <input
                    type="email"
                    placeholder="メールアドレス"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm"
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="パスワード"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={testLoginLoading}
                  className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {testLoginLoading ? 'ログイン中...' : 'ログイン'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  テスト用: student@test.com / student123
                </p>
              </form>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full max-w-xs">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
              学校のアカウントを使用してログインしてください
            </p>
            <button
              onClick={() => navigate('/teacher/login')}
              className="text-sm text-[#59168b] hover:text-[#45106b] underline transition-colors"
            >
              教師の方はこちら
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
