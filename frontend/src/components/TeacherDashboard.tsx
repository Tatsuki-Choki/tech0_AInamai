import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, LogOut, Loader2, ChevronRight, Building2 } from 'lucide-react';
import api from '../lib/api';
import ScatterPlot from './ScatterPlot';

interface StudentSummary {
  id: string;
  user_id: string;
  name: string;
  email: string;
  grade: number | null;
  class_name: string | null;
  theme_title: string | null;
  current_phase: string | null;
  total_reports: number;
  current_streak: number;
  max_streak: number;
  last_report_date: string | null;
  is_primary: boolean;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    // Get user name from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || '');
      } catch {
        // ignore
      }
    }

    // Fetch students
    const fetchStudents = async () => {
      try {
        const response = await api.get<StudentSummary[]>('/dashboard/students');
        setStudents(response.data);
      } catch (err) {
        console.error('Failed to fetch students:', err);
        setError('生徒データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/teacher/student/${studentId}`);
  };

  return (
    <div className="min-h-screen bg-[#fef8f5]">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">教師ダッシュボード</h1>
            <p className="text-purple-200 text-sm">{userName}先生</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/teacher/seminar-labs')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span className="text-sm">ゼミ・研究室</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Scatter Plot Section */}
        <section className="mb-8">
          <ScatterPlot onStudentClick={handleStudentClick} />
        </section>

        {/* Students List Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-800">担当生徒一覧</h2>
            <span className="text-sm text-gray-500">({students.length}名)</span>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-red-500">{error}</p>
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-gray-500">担当生徒がいません</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        生徒名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        学年・組
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        探究テーマ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        フェーズ
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        報告数
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        連続
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        最終報告
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        onClick={() => handleStudentClick(student.id)}
                        className="hover:bg-purple-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{student.name}</p>
                              <p className="text-xs text-gray-500">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">
                            {student.grade && student.class_name
                              ? `${student.grade}年 ${student.class_name}組`
                              : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-800 line-clamp-1">
                            {student.theme_title || '未設定'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {student.current_phase ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                              {student.current_phase}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-medium text-gray-800">{student.total_reports}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="font-medium text-orange-500">{student.current_streak}日</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm text-gray-500">
                            {student.last_report_date || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
