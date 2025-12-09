import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User, BookOpen, Flame, Calendar, Building2, Loader2, Check } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import api, { parseApiError } from '../lib/api';
import type { ApiError } from '../lib/api';
import { CardSkeleton } from './ui/Loading';
import { ErrorDisplay } from './ui/ErrorDisplay';

interface AbilityCount {
  ability_id: string;
  ability_name: string;
  count: number;
}

interface StudentDetail {
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
  ability_counts: AbilityCount[];
  seminar_lab_id?: string;
  seminar_lab_name?: string;
}

interface SeminarLab {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface ReportSummary {
  id: string;
  content: string;
  phase_name?: string;
  abilities: string[];
  ai_comment?: string;
  reported_at: string;
}

// 能力名を短縮表示用にマッピング
const abilityShortNames: { [key: string]: string } = {
  '情報収集能力と先を見る力': '情報収集・先見',
  '課題設定能力と構想する力': '課題設定・構想',
  '巻き込む力': '巻き込む',
  '対話する力': '対話する',
  '実行する力': '実行する',
  '謙虚である力': '謙虚である',
  '完遂する力': '完遂する',
};

export default function TeacherStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [seminarLabs, setSeminarLabs] = useState<SeminarLab[]>([]);
  const [savingLab, setSavingLab] = useState(false);
  const [labSaveSuccess, setLabSaveSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      setError(null);
      const [studentRes, reportsRes, labsRes] = await Promise.all([
        api.get<StudentDetail>(`/dashboard/students/${studentId}`),
        api.get<ReportSummary[]>(`/dashboard/students/${studentId}/reports`),
        api.get<SeminarLab[]>('/master/seminar-labs')
      ]);
      setStudent(studentRes.data);
      setReports(reportsRes.data);
      setSeminarLabs(labsRes.data);
    } catch (err) {
      const apiError = parseApiError(err);
      setError(apiError);
      console.error('Failed to fetch student data:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const handleSeminarLabChange = async (labId: string) => {
    if (!student) return;

    setSavingLab(true);
    setLabSaveSuccess(false);
    try {
      await api.put(`/master/students/${student.id}/seminar-lab`, null, {
        params: { seminar_lab_id: labId || null }
      });
      // Update local state
      const selectedLab = seminarLabs.find(lab => lab.id === labId);
      setStudent({
        ...student,
        seminar_lab_id: labId || undefined,
        seminar_lab_name: selectedLab?.name || undefined,
      });
      setLabSaveSuccess(true);
      setTimeout(() => setLabSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update seminar lab:', err);
      alert('ゼミ/ラボの変更に失敗しました');
    } finally {
      setSavingLab(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // レーダーチャート用のデータを準備
  const getRadarData = () => {
    if (!student?.ability_counts) return [];

    // 最大値を計算（スケーリング用）
    const maxCount = Math.max(...student.ability_counts.map(a => a.count), 1);

    return student.ability_counts.map(ability => ({
      subject: abilityShortNames[ability.ability_name] || ability.ability_name,
      fullName: ability.ability_name,
      count: ability.count,
      // 最大値を100としたスケール
      value: Math.round((ability.count / maxCount) * 100),
    }));
  };

  // ローディング状態
  if (loading) {
    return (
      <div className="bg-[#fef8f5] min-h-screen p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[rgba(243,232,255,0.5)] hover:bg-purple-50"
          >
            <ArrowLeft className="w-5 h-5 text-[#59168b]" />
          </button>
          <h1 className="text-[18px] text-[#59168b] font-bold font-['Zen_Maru_Gothic',sans-serif]">
            生徒詳細
          </h1>
        </div>
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="bg-[#fef8f5] min-h-screen p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/teacher/dashboard')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[rgba(243,232,255,0.5)] hover:bg-purple-50"
          >
            <ArrowLeft className="w-5 h-5 text-[#59168b]" />
          </button>
          <h1 className="text-[18px] text-[#59168b] font-bold font-['Zen_Maru_Gothic',sans-serif]">
            生徒詳細
          </h1>
        </div>
        <ErrorDisplay
          type={error.type}
          message={error.message}
          onRetry={fetchData}
          onBack={() => navigate('/teacher/dashboard')}
        />
      </div>
    );
  }

  // データなし
  if (!student) {
    return (
      <div className="bg-[#fef8f5] min-h-screen p-6">
        <button
          onClick={() => navigate('/teacher/dashboard')}
          className="flex items-center gap-2 text-[#59168b] mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>戻る</span>
        </button>
        <ErrorDisplay
          type="notFound"
          message="生徒が見つかりません"
          onBack={() => navigate('/teacher/dashboard')}
        />
      </div>
    );
  }

  const radarData = getRadarData();
  const totalAbilityCount = student.ability_counts.reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="bg-[#fef8f5] min-h-screen p-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/teacher/dashboard')}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[rgba(243,232,255,0.5)] hover:bg-purple-50"
        >
          <ArrowLeft className="w-5 h-5 text-[#59168b]" />
        </button>
        <h1 className="text-[18px] text-[#59168b] font-bold font-['Zen_Maru_Gothic',sans-serif]">
          生徒詳細
        </h1>
      </div>

      {/* 生徒情報カード */}
      <div className="bg-white rounded-[24px] border border-[rgba(243,232,255,0.5)] shadow-lg p-6 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-[#59168b]" />
          </div>
          <div className="flex-1">
            <h2 className="text-[20px] font-bold text-[#59168b]">{student.name}</h2>
            <p className="text-[14px] text-gray-500">{student.email}</p>
            <p className="text-[14px] text-[rgba(152,16,250,0.7)]">
              {student.grade ? `${student.grade}年` : ''} {student.class_name || ''}
            </p>
          </div>
        </div>

        {/* ゼミ/ラボ割り当て */}
        <div className="bg-purple-50 rounded-[16px] p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#59168b]" />
              <span className="text-[14px] font-bold text-[#59168b]">ゼミ/ラボ</span>
            </div>
            <div className="flex items-center gap-2">
              {savingLab && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
              {labSaveSuccess && <Check className="w-4 h-4 text-green-500" />}
              <select
                value={student.seminar_lab_id || ''}
                onChange={(e) => handleSeminarLabChange(e.target.value)}
                disabled={savingLab}
                className="px-3 py-1.5 text-[14px] text-[#59168b] bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">未割り当て</option>
                {seminarLabs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* テーマ */}
        <div className="bg-purple-50 rounded-[16px] p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-[#59168b]" />
            <span className="text-[14px] font-bold text-[#59168b]">探究テーマ</span>
          </div>
          <p className="text-[16px] text-[#6e11b0]">{student.theme_title || '未設定'}</p>
          {student.current_phase && (
            <p className="text-[12px] text-gray-500 mt-1">フェーズ: {student.current_phase}</p>
          )}
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-[12px] p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-[#59168b]" />
            </div>
            <p className="text-[20px] font-bold text-[#59168b]">{student.total_reports}</p>
            <p className="text-[11px] text-gray-500">報告数</p>
          </div>
          <div className="bg-gray-50 rounded-[12px] p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-[20px] font-bold text-[#59168b]">{student.current_streak}</p>
            <p className="text-[11px] text-gray-500">連続日数</p>
          </div>
          <div className="bg-gray-50 rounded-[12px] p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-[20px] font-bold text-[#59168b]">{student.max_streak}</p>
            <p className="text-[11px] text-gray-500">最高記録</p>
          </div>
        </div>
      </div>

      {/* 7つの力 レーダーチャート */}
      <div className="bg-white rounded-[24px] border border-[rgba(243,232,255,0.5)] shadow-lg p-6 mb-6">
        <h3 className="text-[16px] font-bold text-[#59168b] mb-2">7つの力</h3>
        <p className="text-[12px] text-gray-500 mb-4">
          報告から分析された能力の発揮回数（合計: {totalAbilityCount}回）
        </p>

        {totalAbilityCount > 0 ? (
          <>
            {/* レーダーチャート */}
            <div className="w-full h-[300px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e9d5ff" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#59168b', fontSize: 11 }}
                    tickLine={false}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                    tickCount={5}
                  />
                  <Radar
                    name="能力"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-purple-200 rounded-lg p-3 shadow-lg">
                            <p className="text-[13px] font-bold text-[#59168b]">{data.fullName}</p>
                            <p className="text-[12px] text-gray-600">発揮回数: {data.count}回</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* 能力リスト */}
            <div className="grid grid-cols-1 gap-2">
              {student.ability_counts.map((ability) => (
                <div
                  key={ability.ability_id}
                  className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-[13px] text-[#59168b]">{ability.ability_name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                        style={{
                          width: `${totalAbilityCount > 0 ? (ability.count / Math.max(...student.ability_counts.map(a => a.count))) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-[#59168b] w-8 text-right">
                      {ability.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">まだ報告がないため、能力データがありません</p>
          </div>
        )}
      </div>

      {/* 報告履歴 */}
      <div className="bg-white rounded-[24px] border border-[rgba(243,232,255,0.5)] shadow-lg p-6">
        <h3 className="text-[16px] font-bold text-[#59168b] mb-4">報告履歴</h3>

        {reports.length === 0 ? (
          <p className="text-center text-gray-400 py-8">まだ報告がありません</p>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border border-[rgba(243,232,255,0.5)] rounded-[16px] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-gray-500">
                    {formatDate(report.reported_at)}
                  </span>
                  {report.phase_name && (
                    <span className="text-[12px] bg-purple-100 text-[#59168b] px-2 py-1 rounded-full">
                      {report.phase_name}
                    </span>
                  )}
                </div>

                <p className="text-[14px] text-gray-700 mb-3 whitespace-pre-wrap">
                  {report.content}
                </p>

                {report.abilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {report.abilities.map((ability, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {ability}
                      </span>
                    ))}
                  </div>
                )}

                {report.ai_comment && (
                  <div className="bg-purple-50 rounded-[12px] p-3 mt-2">
                    <p className="text-[12px] text-gray-500 mb-1">AI校長からのコメント</p>
                    <p className="text-[13px] text-[#59168b]">{report.ai_comment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
