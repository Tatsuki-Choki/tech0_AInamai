import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar as CalendarIcon, Activity, Plus, Edit2, Trash2, X, Check, HelpCircle, MessageCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Heading, Text } from '../../components/ui/Typography';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { ReportCard, type Report } from './components/ReportCard';
import {
  type Book,
  type AbilityCount,
  FALLBACK_BOOKS,
  getApiOriginForStatic,
  pickRecommendedBooks,
  getBookShortReason,
  buildAiSummary,
  buildGuidanceHint,
} from './utils/studentDetailUtils';
import ashiatoBlue from '../../assets/figma/ashiato_blue.webp';

interface ResearchTheme {
  id: string;
  title: string;
  description: string | null;
  fiscal_year: number;
  status: string;
}

interface StudentDetail {
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
  seminar_lab_id: string | null;
  seminar_lab_name: string | null;
  ability_counts: AbilityCount[];
}

export default function TeacherStudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'logs'>('summary');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [, setBooks] = useState<Book[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);

  // Theme management state
  const [themes, setThemes] = useState<ResearchTheme[]>([]);
  const [showThemeForm, setShowThemeForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ResearchTheme | null>(null);
  const [themeTitle, setThemeTitle] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  // Student profile edit state
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileGrade, setProfileGrade] = useState<string>('');
  const [profileClassName, setProfileClassName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) {
        setError('学生IDが指定されていません');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch student detail from API
        const studentRes = await api.get<StudentDetail>(`/dashboard/students/${studentId}`);
        setStudent(studentRes.data);

        // Fetch student reports from API
        const reportsRes = await api.get<Report[]>(`/dashboard/students/${studentId}/reports?limit=100`);
        setReports(reportsRes.data);

        // Fetch books master (fallback to embedded 5-books list)
        let booksData: Book[] = [];
        try {
          const booksRes = await api.get<Book[]>(`/master/books`);
          booksData = Array.isArray(booksRes.data) && booksRes.data.length > 0 ? booksRes.data : FALLBACK_BOOKS;
        } catch (bookErr) {
          console.error('Failed to fetch books, using fallback:', bookErr);
          booksData = FALLBACK_BOOKS;
        }
        setBooks(booksData.map(b => {
          // If API returns local static path (which might be broken on Azure), use fallback image
          if (b.cover_image_url?.startsWith('/static')) {
            const fallback = FALLBACK_BOOKS.find(fb => fb.title === b.title);
            if (fallback?.cover_image_url) {
              return { ...b, cover_image_url: fallback.cover_image_url };
            }
          }
          return b;
        }));
        setRecommendedBooks(
          pickRecommendedBooks({
            books: booksData,
            abilityCounts: studentRes.data.ability_counts || [],
            studentIdSeed: studentId,
            limit: 3,
          })
        );

        // Fetch student themes
        try {
          const themesRes = await api.get<ResearchTheme[]>(`/teacher/themes/student/${studentId}`);
          setThemes(themesRes.data);
        } catch (themeErr) {
          console.error('Failed to fetch themes:', themeErr);
        }

      } catch (err: unknown) {
        console.error('Failed to fetch student data:', err);
        const errorMessage = err instanceof Error ? err.message : '学生データの取得に失敗しました';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  // Theme management functions
  const handleOpenThemeForm = (theme?: ResearchTheme) => {
    if (theme) {
      setEditingTheme(theme);
      setThemeTitle(theme.title);
      setThemeDescription(theme.description || '');
    } else {
      setEditingTheme(null);
      setThemeTitle('');
      setThemeDescription('');
    }
    setThemeError(null);
    setShowThemeForm(true);
  };

  const handleCloseThemeForm = () => {
    setShowThemeForm(false);
    setEditingTheme(null);
    setThemeTitle('');
    setThemeDescription('');
    setThemeError(null);
  };

  const handleSaveTheme = async () => {
    if (!themeTitle.trim()) {
      setThemeError('テーマタイトルを入力してください');
      return;
    }

    setThemeSaving(true);
    setThemeError(null);

    try {
      if (editingTheme) {
        // Update existing theme
        const res = await api.put<ResearchTheme>(`/teacher/themes/${editingTheme.id}`, {
          title: themeTitle.trim(),
          description: themeDescription.trim() || null,
        });
        setThemes(themes.map(t => t.id === editingTheme.id ? res.data : t));
        // Update student display
        if (student) {
          setStudent({ ...student, theme_title: res.data.title });
        }
      } else {
        // Create new theme
        const res = await api.post<ResearchTheme>(`/teacher/themes/student/${studentId}`, {
          title: themeTitle.trim(),
          description: themeDescription.trim() || null,
        });
        setThemes([res.data, ...themes]);
        // Update student display
        if (student) {
          setStudent({ ...student, theme_title: res.data.title });
        }
      }
      handleCloseThemeForm();
    } catch (err: unknown) {
      console.error('Failed to save theme:', err);
      const errorMessage = err instanceof Error ? err.message : 'テーマの保存に失敗しました';
      setThemeError(errorMessage);
    } finally {
      setThemeSaving(false);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm('このテーマを削除しますか？')) {
      return;
    }

    try {
      await api.delete(`/teacher/themes/${themeId}`);
      setThemes(themes.filter(t => t.id !== themeId));
      // Update student display if the deleted theme was the current one
      if (student && themes.find(t => t.id === themeId)?.title === student.theme_title) {
        setStudent({ ...student, theme_title: null });
      }
    } catch (err) {
      console.error('Failed to delete theme:', err);
      alert('テーマの削除に失敗しました');
    }
  };

  // Profile edit handlers
  const handleOpenProfileForm = () => {
    if (!student) return;

    // Set current values
    setProfileGrade(student.grade?.toString() || '');
    setProfileClassName(student.class_name || '');
    setProfileError(null);
    setShowProfileForm(true);
  };

  const handleCloseProfileForm = () => {
    setShowProfileForm(false);
    setProfileError(null);
  };

  const handleSaveProfile = async () => {
    if (!student) return;

    setProfileSaving(true);
    setProfileError(null);

    try {
      const updateData: { class_name?: string | null; grade?: number | null } = {};

      // Only include changed values
      const newGrade = profileGrade ? parseInt(profileGrade, 10) : null;
      if (newGrade !== student.grade) {
        updateData.grade = newGrade;
      }

      if (profileClassName !== (student.class_name || '')) {
        updateData.class_name = profileClassName || null;
      }

      const response = await api.put<{
        id: string;
        name: string;
        email: string;
        grade: number | null;
        class_name: string | null;
        message: string;
      }>(`/dashboard/students/${student.id}`, updateData);

      // Update student state with new values
      setStudent({
        ...student,
        grade: response.data.grade,
        class_name: response.data.class_name,
      });

      handleCloseProfileForm();
    } catch (err: unknown) {
      console.error('Failed to save profile:', err);
      const errorMessage = err instanceof Error ? err.message : '生徒情報の保存に失敗しました';
      setProfileError(errorMessage);
    } finally {
      setProfileSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-app flex items-center justify-center">
        <Text>読み込み中...</Text>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-background-app flex flex-col items-center justify-center gap-4 p-4">
        <Text className="text-red-500">{error || 'データが見つかりません'}</Text>
        <Button onClick={() => navigate('/teacher/dashboard')}>
          ダッシュボードに戻る
        </Button>
      </div>
    );
  }

  const staticOrigin = getApiOriginForStatic();

  // Calculate radar data from ability counts
  const radarData = student.ability_counts.map(ac => ({
    subject: ac.ability_name,
    A: ac.count,
    fullMark: Math.max(...student.ability_counts.map(a => a.count), 10)
  }));

  // If no ability counts, show default empty chart
  const displayRadarData = radarData.length > 0 ? radarData : [
    { subject: '情報収集', A: 0, fullMark: 10 },
    { subject: '課題設定', A: 0, fullMark: 10 },
    { subject: '巻き込む', A: 0, fullMark: 10 },
    { subject: '対話', A: 0, fullMark: 10 },
    { subject: '実行', A: 0, fullMark: 10 },
    { subject: '謙虚', A: 0, fullMark: 10 },
    { subject: '完遂', A: 0, fullMark: 10 },
  ];

  // Calendar Helpers
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart); // 0 (Sun) - 6 (Sat)
  const paddingDays = Array.from({ length: startDay });





  const sortedAbilityCountsDesc = [...(student.ability_counts || [])].sort((a, b) => b.count - a.count);
  const topAbility = sortedAbilityCountsDesc[0]?.count ? sortedAbilityCountsDesc[0].ability_name : undefined;
  const sortedAbilityCountsAsc = [...(student.ability_counts || [])].sort((a, b) => a.count - b.count);
  const weakAbility = sortedAbilityCountsAsc.find((a) => a.ability_name && a.ability_id)?.ability_name;
  const aiSummaryText = buildAiSummary({
    studentName: student.name,
    themeTitle: student.theme_title,
    topAbility,
    weakAbility,
    totalReports: student.total_reports,
  });
  const guidanceHintText = buildGuidanceHint({ weakAbility, totalReports: student.total_reports });

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
            <div className="flex flex-col justify-center flex-1">
              <div className="flex items-center justify-between">
                <Heading level={1} className="text-lg">{student.name}</Heading>
                <button
                  onClick={handleOpenProfileForm}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  title="生徒情報を編集"
                >
                  <Edit2 className="w-4 h-4 text-brand-primary" />
                </button>
              </div>
              <Text className="text-sm">メール: {student.email}</Text>
              <Text className="text-sm">
                {student.grade ? `${student.grade}年` : '学年未設定'}
                {student.class_name ? `・${student.class_name}組` : '・クラス未設定'}
              </Text>
              <Text className="text-sm">ゼミ/ラボ: {student.seminar_lab_name || '未設定'}</Text>
            </div>
          </div>
          <div className="mt-4 bg-[#fff4ed] rounded-2xl p-4 border border-[#fff4ed]">
            <div className="flex gap-2 items-start justify-between">
              <div className="flex gap-2 items-center flex-1">
                <span className="text-lg">🔍</span>
                <div className="flex flex-col">
                  <Text className="text-xs">探求学習テーマ</Text>
                  <Text className="text-base font-medium text-brand-primary">{student.theme_title || '未設定'}</Text>
                </div>
              </div>
              <div className="flex gap-1">
                {themes.length > 0 ? (
                  <>
                    <button
                      onClick={() => handleOpenThemeForm(themes[0])}
                      className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                      title="テーマを編集"
                    >
                      <Edit2 className="w-4 h-4 text-brand-primary" />
                    </button>
                    <button
                      onClick={() => handleDeleteTheme(themes[0].id)}
                      className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                      title="テーマを削除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleOpenThemeForm()}
                    className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                    title="テーマを追加"
                  >
                    <Plus className="w-4 h-4 text-brand-primary" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <Text className="text-xs text-gray-500">報告数</Text>
              <Text className="text-lg font-bold text-brand-primary">{student.total_reports}</Text>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <Text className="text-xs text-gray-500">連続記録</Text>
              <Text className="text-lg font-bold text-brand-primary">{student.current_streak}日</Text>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <Text className="text-xs text-gray-500">最大連続</Text>
              <Text className="text-lg font-bold text-brand-primary">{student.max_streak}日</Text>
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
                <Heading level={2} className="text-base">能力評価（報告数ベース）</Heading>
              </div>
              <div className="h-[320px] w-full bg-white rounded-2xl border border-[#f3e8ff]/40 p-2">
                <div className="w-full h-full flex items-center justify-center">
                  <RadarChart width={360} height={300} cx="50%" cy="50%" outerRadius={110} data={displayRadarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#243a9f', fontSize: 12 }} />
                    <Radar name="報告数" dataKey="A" stroke="#243a9f" fill="#243a9f" fillOpacity={0.6} />
                    <Tooltip />
                  </RadarChart>
                </div>
              </div>

              {/* Score Bars */}
              <div className="flex flex-col gap-2 mt-4">
                {student.ability_counts.length > 0 ? (
                  student.ability_counts.map((item) => (
                    <div key={item.ability_id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <span className="text-xs w-24 text-brand-primary truncate">{item.ability_name}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-primary"
                          style={{ width: `${Math.min((item.count / Math.max(...student.ability_counts.map(a => a.count), 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs w-8 text-right text-brand-primary">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <Text className="text-gray-400 text-center py-4">まだ報告がありません</Text>
                )}
              </div>
            </Card>

            {/* AI Summary + Guidance Hint (like the provided design) */}
            <Card className="rounded-card shadow-card p-6 border border-[#f3e8ff]/50">
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-brand-primary">
                    <HelpCircle className="w-5 h-5" />
                    <Heading level={2} className="text-base">AIナマイによる現状整理</Heading>
                  </div>
                  <div className="bg-[#fff4ed] rounded-[24px] p-5 border border-[#fff4ed]">
                    <Text className="text-brand-primary leading-relaxed">
                      {aiSummaryText}
                    </Text>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3 text-brand-primary">
                    <MessageCircle className="w-5 h-5" />
                    <Heading level={2} className="text-base">探究学習指導のヒント</Heading>
                  </div>
                  <div className="bg-[#fff4ed] rounded-[24px] p-5 border border-[#fff4ed]">
                    <Text className="text-brand-primary leading-relaxed">
                      {guidanceHintText}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recommended Books */}
            <Card className="rounded-card shadow-card p-6 border border-[#f3e8ff]/50">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📚</span>
                <Heading level={2} className="text-base">この生徒の指導に役立つ書籍</Heading>
              </div>
              {recommendedBooks.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {recommendedBooks.map((b) => {
                    const cover = b.cover_image_url
                      ? (b.cover_image_url.startsWith('http') ? b.cover_image_url : `${staticOrigin}${b.cover_image_url}`)
                      : undefined;
                    return (
                      <div key={b.id || b.title} className="flex flex-col gap-2">
                        <div className="bg-white rounded-2xl p-2 border border-[#f3e8ff]/50">
                          <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-white border border-[#f3e8ff]/40">
                            {cover ? (
                              <img
                                src={cover}
                                alt={b.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  // Fallback: hide broken image
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                No Image
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <Text className="text-xs font-medium text-brand-primary line-clamp-2">{b.title}</Text>
                          {b.author && (
                            <Text className="text-[10px] text-gray-500 line-clamp-1">{b.author}</Text>
                          )}
                          <Text className="text-[10px] text-gray-600 line-clamp-2">
                            {getBookShortReason(b.title)}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Text className="text-gray-400 text-center py-6">推薦図書の取得に失敗しました</Text>
              )}
            </Card>

            {/* Current Phase */}
            {student.current_phase && (
              <Card className="rounded-card shadow-card p-4 border border-[#f3e8ff]/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📍</span>
                  <Heading level={2} className="text-sm">現在のフェーズ</Heading>
                </div>
                <div className="bg-[#fff4ed] rounded-2xl p-4">
                  <Text className="text-base font-medium text-brand-primary">{student.current_phase}</Text>
                </div>
              </Card>
            )}

            {/* Last Report Date */}
            {student.last_report_date && (
              <Card className="rounded-card shadow-card p-4 border border-[#f3e8ff]/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📅</span>
                  <Heading level={2} className="text-sm">最終報告日</Heading>
                </div>
                <div className="bg-[#fff4ed] rounded-2xl p-4">
                  <Text className="text-base font-medium text-brand-primary">
                    {format(new Date(student.last_report_date), 'yyyy年M月d日', { locale: ja })}
                  </Text>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Calendar View */}
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
                  // Find reports for this day
                  const dayReports = reports.filter(r => format(new Date(r.reported_at), 'yyyy-MM-dd') === dateStr);
                  const hasReport = dayReports.length > 0;
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  // Check for images
                  const hasImage = dayReports.some(r => r.image_url);
                  const firstImage = dayReports.find(r => r.image_url)?.image_url;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                                        aspect-square rounded-lg flex items-center justify-center relative transition-all duration-200 overflow-hidden
                                        ${isSelected ? 'ring-2 ring-brand-primary ring-offset-1' : ''}
                                        ${hasReport && !hasImage ? 'hover:bg-blue-50' : ''}
                                        ${!hasReport && !isSelected ? 'hover:bg-gray-50' : ''}
                                    `}
                    >
                      {/* Day number */}
                      <span className={`absolute top-0.5 left-1 text-xs font-medium z-10 ${hasImage ? 'text-white drop-shadow-md' : (isSelected ? 'text-brand-primary' : 'text-gray-500')}`}>
                        {format(day, 'd')}
                      </span>

                      {/* Content */}
                      {hasImage && firstImage ? (
                        <div className="w-full h-full">
                          <img
                            src={firstImage.startsWith('http') ? firstImage : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${firstImage}`}
                            alt="report"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          {dayReports.length > 1 && (
                            <div className="absolute bottom-0.5 right-0.5 bg-black/50 text-white text-[10px] px-1 rounded">
                              +{dayReports.length - 1}
                            </div>
                          )}
                        </div>
                      ) : hasReport ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={ashiatoBlue}
                            alt="report"
                            className="w-6 h-6 object-contain opacity-80"
                            style={{ transform: `rotate(${(day.getDate() * 15) % 360}deg)` }}
                          />
                        </div>
                      ) : null}

                      {/* Selection indicator if no image / report */}
                      {isSelected && !hasReport && !hasImage && (
                        <div className="absolute inset-0 bg-brand-primary/10 rounded-lg"></div>
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
                  {format(selectedDate, 'M月d日', { locale: ja })}の活動
                </Heading>
                {(() => {
                  const filteredReports = reports.filter(r => {
                    const reportDate = format(new Date(r.reported_at), 'yyyy-MM-dd');
                    return reportDate === format(selectedDate, 'yyyy-MM-dd');
                  });
                  return filteredReports.length > 0 ? (
                    filteredReports.map(report => (
                      <ReportCard key={report.id} report={report} />
                    ))
                  ) : (
                    <Text className="text-center text-gray-400 py-8">報告はありません</Text>
                  );
                })()}
              </div>
            )}

            {/* All Reports List (if no date selected) */}
            {!selectedDate && (
              <div className="flex flex-col gap-4">
                <Heading level={3} className="text-base ml-2">
                  全ての報告 ({reports.length}件)
                </Heading>
                {reports.length > 0 ? (
                  reports.map(report => (
                    <ReportCard key={report.id} report={report} showFullDate />
                  ))
                ) : (
                  <Text className="text-center text-gray-400 py-8">まだ報告がありません</Text>
                )}
              </div>
            )}
          </div>
        )}

        {/* Theme Form Modal */}
        {showThemeForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <Heading level={2} className="text-lg">
                  {editingTheme ? 'テーマを編集' : 'テーマを追加'}
                </Heading>
                <button
                  onClick={handleCloseThemeForm}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {themeError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                    {themeError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    テーマタイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={themeTitle}
                    onChange={(e) => setThemeTitle(e.target.value)}
                    placeholder="例: 地域活性化プロジェクト"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明（任意）
                  </label>
                  <textarea
                    value={themeDescription}
                    onChange={(e) => setThemeDescription(e.target.value)}
                    placeholder="テーマの詳細説明を入力..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCloseThemeForm}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveTheme}
                  disabled={themeSaving}
                  leftIcon={themeSaving ? undefined : <Check className="w-4 h-4" />}
                  className="flex-1"
                >
                  {themeSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Student Profile Edit Modal */}
        {showProfileForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <Heading level={2} className="text-lg">
                  生徒情報を編集
                </Heading>
                <button
                  onClick={handleCloseProfileForm}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {profileError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                    {profileError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    学年
                  </label>
                  <select
                    value={profileGrade}
                    onChange={(e) => setProfileGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  >
                    <option value="">未設定</option>
                    <option value="1">1年</option>
                    <option value="2">2年</option>
                    <option value="3">3年</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    クラス
                  </label>
                  <select
                    value={profileClassName}
                    onChange={(e) => setProfileClassName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  >
                    <option value="">未設定</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 p-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCloseProfileForm}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  leftIcon={profileSaving ? undefined : <Check className="w-4 h-4" />}
                  className="flex-1"
                >
                  {profileSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
