import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { setAuth, clearAuth, type UserRole } from '../../lib/auth';
import { Card } from '../../components/ui/Card';
import { Heading, Text } from '../../components/ui/Typography';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [message, setMessage] = useState('ログイン処理中...');

  useEffect(() => {
    const token = params.get('token');
    const role = (params.get('role') || '') as UserRole;
    const error = params.get('error');

    const goLogin = (msg?: string) => {
      clearAuth();
      navigate(`/login${msg ? `?error=${encodeURIComponent(msg)}` : ''}`, { replace: true });
    };

    (async () => {
      try {
        if (error) return goLogin(error);
        if (!token) return goLogin('認証トークンが取得できませんでした');
        if (role !== 'student' && role !== 'teacher') return goLogin('ロール情報が不正です');

        // store token first so api interceptor can attach it
        setAuth(token, { role });

        // fetch user info to persist login state
        try {
          const me = await api.get('/auth/me');
          const u = me.data as { name?: string; role?: UserRole };
          setAuth(token, { name: u?.name, role: u?.role ?? role });
        } catch {
          // fallback: keep role only
        }

        if (role === 'teacher') navigate('/teacher/dashboard', { replace: true });
        else navigate('/student/menu', { replace: true });
      } catch {
        setMessage('ログインに失敗しました。ログイン画面へ戻ります...');
        setTimeout(() => goLogin('ログインに失敗しました'), 800);
      }
    })();
  }, [navigate, params]);

  return (
    <div className="min-h-screen bg-background-app flex items-center justify-center p-6 font-zen-maru">
      <Card className="w-full max-w-md p-8 text-center">
        <Heading level={2} className="text-brand-primary mb-2">
          Googleログイン
        </Heading>
        <Text>{message}</Text>
      </Card>
    </div>
  );
}





