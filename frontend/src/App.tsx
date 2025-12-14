import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import StudentLogin from './components/StudentLogin';
import TeacherLogin from './components/TeacherLogin';
import StudentMenu from './components/StudentMenu';
import ReportScreen from './components/ReportScreen';
import ReportAnalysisScreen from './components/ReportAnalysisScreen';
import ReportCompleteScreen from './components/ReportCompleteScreen';
import StudentReviewCalendar from './components/StudentReviewCalendar';
import StudentReportDetail from './components/StudentReportDetail';
import TeacherDashboard from './components/TeacherDashboard';
import TeacherStudentDetail from './components/TeacherStudentDetail';
import ThemeCreateScreen from './components/ThemeCreateScreen';
import FloatingChat from './components/FloatingChat';
import SeminarLabManagement from './components/SeminarLabManagement';
import './App.css';

// ユーザー情報の型定義
interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
}

// 認証状態を取得するヘルパー
function getAuthState(): { isAuthenticated: boolean; user: User | null } {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr) as User;
      return { isAuthenticated: true, user };
    } catch {
      return { isAuthenticated: false, user: null };
    }
  }
  return { isAuthenticated: false, user: null };
}

// ProtectedRoute コンポーネント
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = getAuthState();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// FloatingChatを条件付きで表示するラッパー
function FloatingChatWrapper() {
  const location = useLocation();
  const { isAuthenticated, user } = getAuthState();

  // ログインページでは表示しない、学生のみに表示
  const shouldShowChat = isAuthenticated && user?.role === 'student' && !location.pathname.includes('/login');

  if (!shouldShowChat) return null;

  return <FloatingChat />;
}

// Google認証コールバック処理コンポーネント
function GoogleCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const error = params.get('error');

      if (error) {
        setErrorMessage(decodeURIComponent(error));
        setStatus('error');
        return;
      }

      if (token) {
        try {
          // トークンを保存
          localStorage.setItem('access_token', token);

          // APIからユーザー情報を取得
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error('ユーザー情報の取得に失敗しました');
          }

          const user = await response.json();
          localStorage.setItem('user', JSON.stringify(user));
          setStatus('success');

          // ロールに応じてリダイレクト
          if (user.role === 'teacher' || user.role === 'admin') {
            window.location.href = '/teacher/dashboard';
          } else {
            window.location.href = '/student/menu';
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          setErrorMessage('ユーザー情報の取得に失敗しました');
          setStatus('error');
          localStorage.removeItem('access_token');
        }
      } else {
        setErrorMessage('認証トークンが見つかりません');
        setStatus('error');
      }
    };

    handleCallback();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fef8f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">ログイン処理中...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fef8f5]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{errorMessage || 'ログインに失敗しました'}</p>
          <a href="/login" className="text-purple-600 underline">
            ログインページに戻る
          </a>
        </div>
      </div>
    );
  }

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公開ルート */}
        <Route path="/login" element={<StudentLogin />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />

        {/* 学生ルート */}
        <Route
          path="/student/menu"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentMenu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/report"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ReportScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/report/analysis"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ReportAnalysisScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/report/complete"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ReportCompleteScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/review"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentReviewCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/review/:reportId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentReportDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/theme/create"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ThemeCreateScreen />
            </ProtectedRoute>
          }
        />

        {/* 教師ルート */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/student/:studentId"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherStudentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/seminar-labs"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <SeminarLabManagement />
            </ProtectedRoute>
          }
        />

        {/* デフォルトリダイレクト */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* フローティングチャット（学生画面でのみ表示） */}
      <FloatingChatWrapper />
    </BrowserRouter>
  );
}

export default App;
