import { useEffect, useState } from 'react';
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

export default function TeacherLogin() {
  const [googleLoginUrl, setGoogleLoginUrl] = useState<string>('');

  useEffect(() => {
    const fetchLoginUrl = async () => {
      try {
        // 教師用ログインなので role=teacher を渡す
        const response = await api.get('/auth/google/login?role=teacher');
        setGoogleLoginUrl(response.data.auth_url);
      } catch (error) {
        console.error('Login URL fetch error:', error);
      }
    };
    fetchLoginUrl();
  }, []);

  const handleLogin = () => {
    if (googleLoginUrl) {
      window.location.href = googleLoginUrl;
    }
  };

  return (
    <div className="bg-[#fef8f5] content-stretch flex flex-col items-start pb-0 pt-[48.5px] px-[186px] relative size-full min-h-screen">
      <div className="bg-white border border-[rgba(243,232,255,0.5)] border-solid content-stretch flex flex-col gap-[8px] h-[714px] items-center justify-center pb-px pt-[25px] px-[25px] relative rounded-[24px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] shrink-0 w-full max-w-md mx-auto mt-10">
        
        <div className="flex flex-col items-center gap-8 w-full px-8">
          <p className="font-['Zen_Maru_Gothic',sans-serif] text-[20px] text-[#59168b] text-center font-bold">
            教師用ログイン
          </p>
          
          <button
            onClick={handleLogin}
            className="flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-full px-6 py-3 shadow-md hover:bg-gray-50 transition-colors w-full max-w-xs"
          >
            <GoogleIcon />
            <span className="font-medium text-gray-700">Googleでログイン</span>
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              学校のアカウントを使用してログインしてください
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

