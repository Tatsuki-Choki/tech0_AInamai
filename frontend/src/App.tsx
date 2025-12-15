import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginSelection from './features/auth/LoginSelection';
import StudentLogin from './features/auth/StudentLogin';
import TeacherLogin from './features/auth/TeacherLogin';
import StudentMenu from './features/student/StudentMenu';
import ReportScreen from './features/student/ReportScreen';
import TeacherDashboard from './features/teacher/TeacherDashboard';
import TeacherStudentDetail from './features/teacher/TeacherStudentDetail';
import GoogleCallback from './features/auth/GoogleCallback';
import { getStoredUser, isLoggedIn, type UserRole } from './lib/auth';

function ProtectedRoute({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const loggedIn = isLoggedIn();
  const user = getStoredUser();
  if (!loggedIn) return <Navigate to="/login" replace />;
  if (!user?.role) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    // role mismatch: send user to their own home rather than login
    return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/menu'} replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginSelection />} />
        
        {/* Auth Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />

        {/* Student Routes */}
        <Route
          path="/student/menu"
          element={
            <ProtectedRoute role="student">
              <StudentMenu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/report"
          element={
            <ProtectedRoute role="student">
              <ReportScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/calendar"
          element={
            <ProtectedRoute role="student">
              <div className="p-8 text-center">
                カレンダー機能は準備中です{' '}
                <a href="/student/menu" className="text-blue-500 underline">
                  戻る
                </a>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute role="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/student/:studentId"
          element={
            <ProtectedRoute role="teacher">
              <TeacherStudentDetail />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
