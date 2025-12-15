import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar as CalendarIcon, FileText, Activity } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Heading, Text } from '../../components/ui/Typography';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';

interface Report {
  id: string;
  date: string;
  content: string;
  image_url?: string;
  phase?: string;
}

interface StudentDetail {
  id: string;
  user_id: string;
  name: string;
  grade: number | null;
  class_name: string | null;
  student_number: string | null;
  theme_title: string | null;
  scores: {
    info_collection: number;
    issue_setting: number;
    involvement: number;
    dialogue: number;
    execution: number;
    humility: number;
    completion: number;
  };
  ai_summary: string;
  guidance_hint: string;
}

export default function TeacherStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'logs'>('summary');
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 1)); // Dec 2025 as per Figma
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        // Mock data fetching
        // const studentRes = await api.get(`/teacher/students/${studentId}`);
        // setStudent(studentRes.data);
        
        // Mock data based on Figma 1:2407
        setStudent({
            id: studentId || '1',
            user_id: 'u1',
            name: '山田太郎',
            grade: 3,
            class_name: 'A',
            student_number: '123456',
            theme_title: '地域の環境問題',
            scores: {
                info_collection: 85,
                issue_setting: 90,
                involvement: 50,
                dialogue: 50,
                execution: 20,
                humility: 75,
                completion: 20
            },
            ai_summary: '課題設定能力と構想する力が優れています。身の回りの違和感を探求テーマに落とし込んでおり、テーマに対して、ゴールのイメージを持ちながらを・誰から・どう調べるか計画を立て、取り組んでいます。',
            guidance_hint: '生徒が情報を収集する際には、情報源の信頼性の高い情報源について教師から話題を振りましょう。また、収集した情報を活用して次の展開を予測する練習を取り入れることで、先を見る力を伸ばすことができます。'
        });

        // Mock reports
        setReports([
            { id: 'r1', date: '2025-12-05', content: '今日は図書館で本を借りました。', phase: '情報収集' },
            { id: 'r2', date: '2025-12-08', content: '地域の人にインタビューしました。', phase: '対話' },
        ]);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  if (loading || !student) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const radarData = [
    { subject: '情報収集', A: student.scores.info_collection, fullMark: 100 },
    { subject: '課題設定', A: student.scores.issue_setting, fullMark: 100 },
    { subject: '巻き込む', A: student.scores.involvement, fullMark: 100 },
    { subject: '対話', A: student.scores.dialogue, fullMark: 100 },
    { subject: '実行', A: student.scores.execution, fullMark: 100 },
    { subject: '謙虚', A: student.scores.humility, fullMark: 100 },
    { subject: '完遂', A: student.scores.completion, fullMark: 100 },
  ];

  // Calendar Helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart); // 0 (Sun) - 6 (Sat)
  const paddingDays = Array.from({ length: startDay });

  return (
    <div className="min-h-screen bg-background-app p-4 font-zen-maru">
      <div className="max-w-[428px] mx-auto flex flex-col gap-4">
        
        {/* Header */}
        <Button 
            variant="ghost" 
            size="sm" 
            leftIcon={<ChevronLeft />} 
            onClick={() => navigate('/teacher/dashboard')} 
            className="pl-0 text-brand-primary justify-start w-fit"
        >
            生徒一覧に戻る
        </Button>

        {/* Student Profile */}
        <Card className="rounded-card border border-[#f3e8ff]/50 shadow-card p-4">
            <div className="flex gap-4">
                <div className="w-16 h-16 rounded-full border border-brand-primary flex items-center justify-center bg-white">
                    <span className="text-2xl">👤</span>
                </div>
                <div className="flex flex-col justify-center">
                    <Heading level={1} className="text-lg">{student.name}</Heading>
                    <Text className="text-sm">学籍番号: {student.student_number}</Text>
                    <Text className="text-sm">学年: {student.grade}年・クラス: {student.class_name}組</Text>
                </div>
            </div>
            <div className="mt-4 bg-[#fff4ed] rounded-2xl p-4 border border-[#fff4ed]">
                <div className="flex gap-2 items-center">
                    <span className="text-lg">🔍</span>
                    <div className="flex flex-col">
                        <Text className="text-xs">探求学習テーマ</Text>
                        <Text className="text-base font-medium text-brand-primary">{student.theme_title}</Text>
                    </div>
                </div>
            </div>
        </Card>

        {/* Tabs */}
        <div className="flex border-b border-[#f3e8ff]/50">
            <button 
                className={`flex-1 py-3 text-center text-base font-medium transition-colors ${activeTab === 'summary' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-400'}`}
                onClick={() => setActiveTab('summary')}
            >
                サマリー
            </button>
            <button 
                className={`flex-1 py-3 text-center text-base font-medium transition-colors ${activeTab === 'logs' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-gray-400'}`}
                onClick={() => setActiveTab('logs')}
            >
                報告ログ
            </button>
        </div>

        {/* Content */}
        {activeTab === 'summary' ? (
            <div className="flex flex-col gap-4">
                {/* Radar Chart */}
                <Card className="rounded-card shadow-card p-6 border border-[#f3e8ff]/50">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="text-brand-primary" />
                        <Heading level={2} className="text-base">能力評価</Heading>
                    </div>
                    <div className="h-[320px] w-full bg-white rounded-2xl border border-[#f3e8ff]/40 p-2">
                        <div className="w-full h-full flex items-center justify-center">
                            <RadarChart width={360} height={300} cx="50%" cy="50%" outerRadius={110} data={radarData}>
                                <PolarGrid stroke="#e5e7eb" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#243a9f', fontSize: 12 }} />
                                <Radar name="Score" dataKey="A" stroke="#243a9f" fill="#243a9f" fillOpacity={0.6} />
                                <Tooltip />
                            </RadarChart>
                        </div>
                    </div>
                    
                    {/* Score Bars (Simplified from Figma) */}
                    <div className="flex flex-col gap-2 mt-4">
                        {radarData.map((item) => (
                            <div key={item.subject} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                                <span className="text-xs w-20 text-brand-primary">{item.subject}</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-primary" style={{ width: `${item.A}%` }}></div>
                                </div>
                                <span className="text-xs w-8 text-right text-brand-primary">{item.A}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* AI Summary */}
                <Card className="rounded-card shadow-card p-4 border border-[#f3e8ff]/50">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🤖</span>
                        <Heading level={2} className="text-sm">AI生井による現状整理</Heading>
                    </div>
                    <div className="bg-[#fff4ed] rounded-2xl p-4">
                        <Text className="text-sm leading-relaxed">{student.ai_summary}</Text>
                    </div>
                </Card>

                {/* Guidance Hint */}
                <Card className="rounded-card shadow-card p-4 border border-[#f3e8ff]/50">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💡</span>
                        <Heading level={2} className="text-sm">探究学習指導のヒント</Heading>
                    </div>
                    <div className="bg-[#fff4ed] rounded-2xl p-4">
                        <Text className="text-sm leading-relaxed">{student.guidance_hint}</Text>
                    </div>
                </Card>
            </div>
        ) : (
            <div className="flex flex-col gap-4">
                {/* Calendar View (Existing Implementation) */}
                <Card className="rounded-card shadow-card p-6 border border-[#f3e8ff]/50">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-brand-primary">
                            <CalendarIcon className="w-5 h-5" />
                            <span className="text-xl font-medium font-zen-maru">
                                {format(currentDate, 'yyyy年 M月', { locale: ja })}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-gray-100 rounded-full text-brand-primary">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-gray-100 rounded-full text-brand-primary">
                                <ChevronLeft className="w-5 h-5 rotate-180" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                            <div key={day} className="text-center text-xs text-brand-text-secondary py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {paddingDays.map((_, i) => (
                            <div key={`padding-${i}`} className="aspect-square" />
                        ))}
                        {daysInMonth.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const hasReport = reports.some(r => r.date === dateStr);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            
                            return (
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        aspect-square rounded-full flex items-center justify-center relative transition-colors
                                        ${isSelected ? 'bg-brand-primary text-white' : 'hover:bg-gray-50 text-brand-primary'}
                                    `}
                                >
                                    <span className="text-sm font-medium z-10">{format(day, 'd')}</span>
                                    {hasReport && !isSelected && (
                                        <div className="absolute inset-0 m-1">
                                            {/* Footprint Icon as per Figma */}
                                            <span className="absolute bottom-0 right-0 text-[10px]">🐾</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </Card>
                
                {/* Selected Date Report Detail */}
                {selectedDate && (
                    <div className="flex flex-col gap-4">
                        <Heading level={3} className="text-base ml-2">
                            {format(selectedDate, 'M月d日')}の活動
                        </Heading>
                        {reports.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                            reports.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd')).map(report => (
                                <Card key={report.id} className="rounded-card shadow-card p-4 border border-[#f3e8ff]/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="bg-brand-primary/10 text-brand-primary text-xs px-2 py-1 rounded-full">
                                            {report.phase || '活動報告'}
                                        </span>
                                    </div>
                                    <Text className="text-sm">{report.content}</Text>
                                </Card>
                            ))
                        ) : (
                            <Text className="text-center text-gray-400 py-8">報告はありません</Text>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
