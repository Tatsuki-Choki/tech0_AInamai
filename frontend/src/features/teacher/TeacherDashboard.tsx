import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Users, Search, AlertCircle, AlertTriangle, Star } from 'lucide-react';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Heading, Text } from '../../components/ui/Typography';
import ScatterPlot from './components/ScatterPlot';
import { clearAuth } from '../../lib/auth';

interface StudentSummary {
  id: string;
  user_id: string;
  name: string;
  grade: number | null;
  class_name: string | null;
  theme_title: string | null;
  total_reports: number;
  status?: 'alert' | 'warning' | 'good' | 'attention'; // Added status for UI
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list'); // Default to list view as per Figma
  
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        // モックデータへのフォールバック付き
        try {
          const response = await api.get<StudentSummary[]>('/dashboard/students');
          setStudents(response.data);
        } catch {
             // Mock data based on Figma 169:702
             setStudents([
                 { id: '1', user_id: 'u1', name: '山田太郎', grade: 3, class_name: 'A', theme_title: '地域の環境問題', total_reports: 15, status: 'alert' },
                 { id: '2', user_id: 'u2', name: '佐藤花子', grade: 3, class_name: 'B', theme_title: '学校の省エネ', total_reports: 12, status: 'warning' },
                 { id: '3', user_id: 'u3', name: '鈴木一郎', grade: 3, class_name: 'C', theme_title: '地域の文化', total_reports: 10, status: 'good' },
                 { id: '4', user_id: 'u4', name: '田中美咲', grade: 2, class_name: 'A', theme_title: '地域の伝統文化', total_reports: 8, status: 'good' },
                 { id: '5', user_id: 'u5', name: '高橋健太', grade: 2, class_name: 'B', theme_title: 'プログラミング教室', total_reports: 5, status: 'good' },
                 { id: '6', user_id: 'u6', name: '伊藤愛', grade: 2, class_name: 'C', theme_title: '学校の図書館改善', total_reports: 20, status: 'attention' },
                 { id: '7', user_id: 'u7', name: '渡辺翔', grade: 1, class_name: 'A', theme_title: '地域のゴミ問題', total_reports: 3, status: 'attention' },
                 { id: '8', user_id: 'u8', name: '小林優', grade: 1, class_name: 'B', theme_title: '防災マップ作成', total_reports: 6, status: 'good' },
                 { id: '9', user_id: 'u9', name: '中村あかり', grade: 1, class_name: 'C', theme_title: '地域の文化', total_reports: 9, status: 'attention' },
                 { id: '10', user_id: 'u10', name: '吉田大輝', grade: 1, class_name: 'A', theme_title: '学校の花壇プロジェクト', total_reports: 11, status: 'good' },
             ]);
        }

      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/teacher/student/${studentId}`);
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
                                className="bg-transparent border-none outline-none text-brand-text-secondary w-full placeholder-[#8e8e93]"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                        <select className="bg-white border-[1.25px] border-white rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none">
                            <option>すべての学年</option>
                        </select>
                        <select className="bg-white border-[1.25px] border-white rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none">
                            <option>すべてのクラス</option>
                        </select>
                        <select className="bg-white border-[1.25px] border-white rounded-[16px] h-[43px] text-xs px-2 text-brand-primary outline-none">
                            <option>メディアラボ</option>
                        </select>
                    </div>

                    <Text className="text-brand-primary text-base">
                        {students.length}件の生徒が見つかりました
                    </Text>

                    {/* Student List */}
                    <div className="flex flex-col gap-3 pb-20">
                        {students.map((student) => (
                            <div 
                                key={student.id} 
                                className="bg-white border-[1.25px] border-[#f3e8ff]/50 rounded-[16px] p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow relative"
                                onClick={() => handleStudentClick(student.id)}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-20">
                                        <Text className="text-brand-primary text-base font-medium">{student.name}</Text>
                                    </div>
                                    <div className="w-16">
                                        <Text className="text-brand-primary text-sm">{student.grade}年{student.class_name}組</Text>
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        {/* Theme Icon Placeholder */}
                                        <div className="w-4 h-4 bg-brand-primary/10 rounded-full flex items-center justify-center">
                                            <span className="text-[10px]">T</span>
                                        </div>
                                        <Text className="text-brand-primary text-sm truncate">{student.theme_title}</Text>
                                    </div>
                                </div>
                                
                                {/* Status Icon */}
                                <div className="absolute top-3 right-[-30px]">
                                    {student.status === 'alert' && <span className="text-xl">🚨</span>}
                                    {student.status === 'warning' && <span className="text-xl">‼️</span>}
                                    {student.status === 'good' && <span className="text-xl">🌟</span>}
                                    {student.status === 'attention' && <span className="text-xl">❗</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <Card className="shadow-none border-none bg-transparent p-0">
                    <Heading level={2} className="mb-4 text-xl">生徒の進捗状況</Heading>
                    <div className="h-[400px] w-full relative bg-white rounded-card p-4 shadow-sm">
                        <ScatterPlot onStudentClick={handleStudentClick} />
                    </div>
                </Card>
            )}
        </main>
      </div>
    </div>
  );
}

