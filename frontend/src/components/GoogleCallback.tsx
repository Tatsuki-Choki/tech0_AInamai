import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'admin';
}

interface AuthResponse {
  access_token: string;
  user: User;
}

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const effectRan = useRef(false);

  useEffect(() => {
    // React.StrictModeでの二重実行防止
    if (effectRan.current) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      console.error('No auth code found');
      navigate('/login');
      return;
    }

    effectRan.current = true;

    // state パラメータから役割を取得
    let requestedRole = 'student';
    if (state) {
      try {
        const decodedState = atob(state);
        const params = new URLSearchParams(decodedState);
        requestedRole = params.get('role') || 'student';
      } catch (e) {
        console.error('Failed to parse state:', e);
      }
    }

    const exchangeCode = async () => {
      try {
        const response = await api.post<AuthResponse>('/auth/google/callback', {
          code,
          requested_role: requestedRole
        });
        const { access_token, user } = response.data;

        // トークンとユーザー情報を保存
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));

        // ロールに応じてリダイレクト
        if (user.role === 'teacher' || user.role === 'admin') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/menu');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        // エラー表示後にログイン画面へ戻すなどの処理
        alert('ログインに失敗しました。');
        navigate('/login');
      }
    };

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fef8f5]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59168b] mx-auto mb-4"></div>
        <p className="text-[#59168b] font-['Zen_Maru_Gothic',sans-serif]">
          認証中...
        </p>
      </div>
    </div>
  );
}

