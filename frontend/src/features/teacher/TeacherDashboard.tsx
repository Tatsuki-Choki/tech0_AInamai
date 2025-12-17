import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Search } from 'lucide-react';
import api from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Heading, Text } from '../../components/ui/Typography';
import ScatterPlot from './components/ScatterPlot';
import { clearAuth } from '../../lib/auth';
import type { StudentSummary } from '../../types';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await api.get<StudentSummary[]>('/dashboard/students');
        setStudents(response.data);
      } catch (err) {
        console.error('Failed to fetch students:', err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const grades = [...new Set(students.map(s => s.grade).filter(g => g !== null))].sort((a, b) => (a || 0) - (b || 0));
    const classes = [...new Set(students.map(s => s.class_name).filter(c => c !== null))].sort();
    const themes = [...new Set(students.map(s => s.theme_title).filter(t => t !== null))].sort();
    return { grades, classes, themes };
  }, [students]);

  // Filter students based on search and filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Search filter
      if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Grade filter
      if (selectedGrade !== 'all' && student.grade?.toString() !== selectedGrade) {
        return false;
      }
      // Class filter
      if (selectedClass !== 'all' && student.class_name !== selectedClass) {
        return false;
      }
      // Theme filter
      if (selectedTheme !== 'all' && student.theme_title !== selectedTheme) {
        return false;
      }
      return true;
    });
  }, [students, searchQuery, selectedGrade, selectedClass, selectedTheme]);

  // Summary (scatter) uses the same dropdown filters, but does not depend on search
  const filteredStudentsForSummary = useMemo(() => {
    return students.filter(student => {
      if (selectedGrade !== 'all' && student.grade?.toString() !== selectedGrade) return false;
      if (selectedClass !== 'all' && student.class_name !== selectedClass) return false;
      if (selectedTheme !== 'all' && student.theme_title !== selectedTheme) return false;
      return true;
    });
  }, [students, selectedGrade, selectedClass, selectedTheme]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/teacher/student/${studentId}`);
  };

  const medianTotalReports = useMemo(() => {
    const values = students.map(s => s.total_reports).filter(v => typeof v === 'number' && !Number.isNaN(v));
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }, [students]);

  const getStudentIcon = (student: StudentSummary): 'star' | 'siren' | null => {
    const median = medianTotalReports;

    // Edge case: median=0 のときは「0は🚨、1以上は⭐️」の直感的挙動に寄せる
    const starThreshold = median === 0 ? 1 : median * 1.2;
    const sirenThreshold = median * 0.5;

    if (student.total_reports >= starThreshold) return 'star';
    if (student.total_reports <= sirenThreshold) return 'siren';
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-app flex items-center justify-center">
        <Text>Loading...</Text>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 font-zen-maru">
      <div className="max-w-[404px] mx-auto flex flex-col gap-6 border-[1.25px] border-[#f3e8ff]/50 rounded-[24px] bg-[#fff4ed] p-[17px] shadow-card">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Heading level={1} className="text-lg font-zen-maru text-brand-primary">
            教師用トップぺージ
          </Heading>
          <button onClick={handleLogout} className="bg-[#8e8e93] rounded-[24px] px-4 py-2 flex items-center gap-2 text-white text-sm hover:opacity-90 transition-opacity">
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1.5 rounded-[16px]">
          <button
            className={`flex-1 h-12 rounded-[24px] flex items-center justify-center gap-2 text-base font-medium transition-colors ${viewMode === 'list' ? 'bg-brand-buttons text-white shadow-sm' : 'bg-white text-brand-primary hover:bg-gray-50'}`}
            onClick={() => setViewMode('list')}
          >
            <Users className="w-4 h-4" />
            生徒一覧
          </button>
          <button
            className={`flex-1 h-12 rounded-[24px] flex items-center justify-center gap-2 text-base font-medium transition-colors ${viewMode === 'summary' ? 'bg-brand-buttons text-white shadow-sm' : 'bg-white text-brand-primary hover:bg-gray-50 shadow-sm'}`}
            onClick={() => setViewMode('summary')}
          >
            サマリー
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col gap-4">
          {viewMode === 'list' ? (
            <>
              {/* Search & Filter */}
              <div className="relative">
                <div className="bg-white border-[1.25px] border-white rounded-[24px] h-[58px] flex items-center px-5">
                  <Search className="w-5 h-5 text-[#8e8e93] mr-3" />
                  <input
                    type="text"
                    placeholder="生徒の名前で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-brand-text-secondary w-full placeholder-[#8e8e93]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <select
                  className="bg-white border-[1.25px] border-white rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none cursor-pointer"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                >
                  <option value="all">学年</option>
                  {filterOptions.grades.map(grade => (
                    <option key={grade} value={grade?.toString()}>{grade}年</option>
                  ))}
                </select>
                <select
                  className="bg-white border-[1.25px] border-white rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none cursor-pointer"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="all">クラス</option>
                  {filterOptions.classes.map(cls => (
                    <option key={cls} value={cls || ''}>{cls}組</option>
                  ))}
                </select>
                <select
                  className="bg-white border-[1.25px] border-white rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none cursor-pointer"
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                >
                  <option value="all">テーマ</option>
                  {filterOptions.themes.map(theme => (
                    <option key={theme} value={theme || ''}>{theme}</option>
                  ))}
                </select>
              </div>

              <Text className="text-brand-primary text-base">
                {filteredStudents.length}件の生徒が見つかりました
              </Text>

              {/* Student List */}
              <div className="flex flex-col gap-3 pb-20">
                {filteredStudents.map((student) => {
                  const icon = getStudentIcon(student);
                  return (
                    <button
                      key={student.id}
                      className="bg-white border-[1.25px] border-[#f3e8ff]/50 rounded-[16px] p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden text-left w-full"
                      onClick={() => handleStudentClick(student.id)}
                      aria-label={`${student.name}の詳細へ`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-8">
                        <div className="w-20 shrink-0">
                          <Text className="text-brand-primary text-base font-medium truncate block">{student.name}</Text>
                        </div>
                        <div className="w-16 shrink-0">
                          <Text className="text-brand-primary text-sm truncate block">
                            {student.grade ? `${student.grade}年` : ''}{student.class_name ? `${student.class_name}組` : ''}
                          </Text>
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          {/* Theme Icon Placeholder */}
                          <div className="w-4 h-4 bg-brand-primary/10 rounded-full flex items-center justify-center shrink-0 flex-shrink-0">
                            <span className="text-[10px]">T</span>
                          </div>
                          <Text className="text-brand-primary text-sm truncate block">{student.theme_title || '未設定'}</Text>
                        </div>
                      </div>

                      {/* Status Icon */}
                      <div className="absolute top-3 right-3 shrink-0">
                        {icon === 'siren' && <span className="text-xl">🚨</span>}
                        {icon === 'star' && <span className="text-xl">⭐️</span>}
                      </div>
                    </button>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <div className="text-center py-8">
                    <Text className="text-gray-400">該当する生徒がいません</Text>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Card className="shadow-none border-none bg-transparent p-0">
              <div className="w-full bg-white rounded-card p-4 shadow-sm">
                <Heading level={2} className="mb-4 text-xl">生徒の進捗状況</Heading>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <select
                    className="bg-white border-[1.25px] border-[#f3e8ff]/50 rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none cursor-pointer"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                  >
                    <option value="all">学年</option>
                    {filterOptions.grades.map(grade => (
                      <option key={grade} value={grade?.toString()}>{grade}年</option>
                    ))}
                  </select>
                  <select
                    className="bg-white border-[1.25px] border-[#f3e8ff]/50 rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none cursor-pointer"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="all">クラス</option>
                    {filterOptions.classes.map(cls => (
                      <option key={cls} value={cls || ''}>{cls}組</option>
                    ))}
                  </select>
                  <select
                    className="bg-white border-[1.25px] border-[#f3e8ff]/50 rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none cursor-pointer"
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                  >
                    <option value="all">テーマ</option>
                    {filterOptions.themes.map(theme => (
                      <option key={theme} value={theme || ''}>{theme}</option>
                    ))}
                  </select>
                </div>
                <ScatterPlot
                  onStudentClick={handleStudentClick}
                  students={filteredStudentsForSummary.map(s => ({
                    id: s.id,
                    name: s.name,
                    grade: s.grade,
                    class_name: s.class_name,
                  }))}
                />
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
