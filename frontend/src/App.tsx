import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentLogin from './components/StudentLogin';
import TeacherLogin from './components/TeacherLogin';
import GoogleCallback from './components/GoogleCallback';
import StudentMenu from './components/StudentMenu';
import ReportScreen from './components/ReportScreen';
import ReportAnalysisScreen from './components/ReportAnalysisScreen';
import ReportCompleteScreen from './components/ReportCompleteScreen';
import TeacherDashboard from './components/TeacherDashboard';
import TeacherStudentDetail from './components/TeacherStudentDetail';
import ReviewDateSelection from './components/ReviewDateSelection';
import ReviewDateDetail from './components/ReviewDateDetail';
import ThemeCreateScreen from './components/ThemeCreateScreen';

// 認証ガードコンポーネント（簡易版）
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公開ルート */}
        <Route path="/login" element={<StudentLogin />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />

        {/* 生徒用保護ルート */}
        <Route path="/student/menu" element={<ProtectedRoute><StudentMenu /></ProtectedRoute>} />
        <Route path="/student/theme/create" element={<ProtectedRoute><ThemeCreateScreen /></ProtectedRoute>} />
        <Route path="/student/report" element={<ProtectedRoute><ReportScreen /></ProtectedRoute>} />
        <Route path="/student/report/analysis" element={<ProtectedRoute><ReportAnalysisScreen /></ProtectedRoute>} />
        <Route path="/student/report/complete" element={<ProtectedRoute><ReportCompleteScreen /></ProtectedRoute>} />
        <Route path="/student/review" element={<ProtectedRoute><ReviewDateSelection /></ProtectedRoute>} />
        <Route path="/student/review/:date" element={<ProtectedRoute><ReviewDateDetail /></ProtectedRoute>} />

        {/* 教師用保護ルート */}
        <Route path="/teacher/dashboard" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/students/:studentId" element={<ProtectedRoute><TeacherStudentDetail /></ProtectedRoute>} />
        
        {/* デフォルトリダイレクト */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
