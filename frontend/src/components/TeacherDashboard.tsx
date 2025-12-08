import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, ChevronDown } from 'lucide-react';
import api from '../lib/api';

interface Student {
  id: string;
  user_id: string;
  name: string;
  email: string;
  grade?: number;
  class_name?: string;
  theme_title?: string;
  current_phase?: string;
  total_reports: number;
  current_streak: number;
  max_streak: number;
  last_report_date?: string;
  is_primary: boolean;
}

export default function TeacherDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get<Student[]>('/dashboard/students');
        setStudents(response.data);
      } catch (error) {
        console.error('Failed to fetch students:', error);
      }
    };
    fetchStudents();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      navigate('/teacher/login');
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.includes(searchTerm) || (student.class_name && student.class_name.includes(searchTerm))
  );

  return (
    <div className="bg-[#fef8f5] relative size-full min-h-screen p-6">
      
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-purple-100 rounded-2xl flex items-center justify-center">
            {/* アイコンプレースホルダー */}
            <div className="w-5 h-5 bg-purple-300 rounded-full" />
          </div>
          <h1 className="text-[18px] text-[#59168b] font-bold font-['Zen_Maru_Gothic',sans-serif]">
            教師用ダッシュボード
          </h1>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-[24px] border border-[rgba(243,232,255,0.5)] bg-[rgba(250,245,255,0.5)] hover:bg-purple-50 transition-colors"
        >
          <LogOut className="w-4 h-4 text-[#8200db]" />
          <span className="text-[#8200db] text-[14px]">ログアウト</span>
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="bg-white rounded-[24px] border border-[rgba(243,232,255,0.5)] shadow-lg p-4 min-h-[80vh]">
        
        {/* 検索・フィルター */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
            <input 
              type="text" 
              placeholder="生徒の名前で検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[58px] pl-14 pr-4 rounded-[24px] border border-[rgba(233,212,255,0.5)] bg-white text-[16px] focus:outline-none focus:ring-2 focus:ring-purple-200 placeholder-[rgba(218,178,255,0.6)]"
            />
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2">
            <button className="flex items-center justify-between px-4 h-[43px] min-w-[117px] bg-white border border-[rgba(233,212,255,0.5)] rounded-[16px] text-sm text-gray-600">
              <span>クラス</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <button className="flex items-center justify-between px-4 h-[43px] min-w-[121px] bg-white border border-[rgba(233,212,255,0.5)] rounded-[16px] text-sm text-gray-600">
              <span>フェーズ</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 検索結果カウント */}
        <p className="text-[16px] text-[rgba(152,16,250,0.6)] mb-4 pl-1">
          {filteredStudents.length}件の生徒が見つかりました
        </p>

        {/* 生徒リスト */}
        <div className="flex flex-col gap-3">
          {filteredStudents.map((student) => (
            <button 
              key={student.id}
              onClick={() => navigate(`/teacher/students/${student.id}`)}
              className="w-full bg-white border border-[rgba(243,232,255,0.5)] rounded-[16px] p-4 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="flex items-center gap-4 mb-3">
                <h3 className="text-[16px] font-bold text-[#59168b] w-[80px]">{student.name}</h3>
                <span className="text-[14px] text-[rgba(152,16,250,0.7)] w-[60px]">{student.class_name || '-'}</span>

                {/* テーマバッジ */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-4 h-4 bg-purple-200 rounded-full shrink-0" />
                  <span className="text-[14px] text-[#6e11b0] truncate">{student.theme_title || '未設定'}</span>
                </div>
              </div>

              {/* ステータス情報 */}
              <div className="grid grid-cols-4 gap-2 text-[12px] pl-4 border-t border-gray-100 pt-2">
                <div>
                  <span className="text-gray-400 block">フェーズ:</span>
                  <span className="text-[#59168b] font-medium">{student.current_phase || '未設定'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">報告数:</span>
                  <span className="text-[#59168b] font-medium">{student.total_reports}件</span>
                </div>
                <div>
                  <span className="text-gray-400 block">連続:</span>
                  <span className="text-[#59168b] font-medium">{student.current_streak}日</span>
                </div>
                <div>
                  <span className="text-gray-400 block">最終報告:</span>
                  <span className="text-[#59168b] font-medium">{student.last_report_date || '-'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

