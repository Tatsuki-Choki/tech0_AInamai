import { useState, useEffect, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { Text } from '../../../components/ui/Typography';
import type { AbilityInfo, ScatterDataResponse, MasterAbilityResponse } from '../../../types';

interface Props {
  onStudentClick?: (studentId: string) => void;
  students?: Array<{
    id: string;
    name: string;
    grade: number | null;
    class_name: string | null;
  }>;
}

export default function ScatterPlot({ onStudentClick, students }: Props) {
  const [data, setData] = useState<ScatterDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 能力一覧は master から取得（正式名称＆7つを保証するため）
        let abilitiesMaster: AbilityInfo[] = [];
        try {
          const abilitiesRes = await api.get<MasterAbilityResponse[]>('/master/abilities');
          abilitiesMaster = (abilitiesRes.data || [])
            .map((a) => ({ id: a.id, name: a.name, display_order: a.display_order }))
            .sort((a, b) => a.display_order - b.display_order);
        } catch (e) {
          console.warn('Failed to fetch abilities master, fallback to embedded abilities', e);
        }

        // エラー時はモックデータにフォールバックする（ただし abilities は7つの正式名称を優先）
        try {
          const response = await api.get<ScatterDataResponse>('/dashboard/scatter-data');
          const mergedAbilities = abilitiesMaster.length > 0 ? abilitiesMaster : response.data.abilities;
          setData({ ...response.data, abilities: mergedAbilities });
          if (mergedAbilities.length >= 1) setSelectedAbility(mergedAbilities[0].id);
        } catch (apiErr) {
           console.warn('API fetch failed, using mock data', apiErr);
           const embeddedAbilities: AbilityInfo[] = [
             { id: 'ability1', name: '情報収集能力と先を見る力', display_order: 1 },
             { id: 'ability2', name: '課題設定能力と構想する力', display_order: 2 },
             { id: 'ability3', name: '巻き込む力', display_order: 3 },
             { id: 'ability4', name: '対話する力', display_order: 4 },
             { id: 'ability5', name: '実行する力', display_order: 5 },
             { id: 'ability6', name: '謙虚である力', display_order: 6 },
             { id: 'ability7', name: '完遂する力', display_order: 7 },
           ];
           const abilitiesForMock = abilitiesMaster.length > 0 ? abilitiesMaster : embeddedAbilities;

           // Mock Data
           const mockData: ScatterDataResponse = {
             abilities: abilitiesForMock,
             data_points: (students && students.length > 0)
               ? students.map((s) => ({
                   student_id: s.id,
                   student_name: s.name,
                   grade: s.grade,
                   class_name: s.class_name,
                   // APIが取れない場合は「表示上は同じ生徒集合」で0埋め（誤解を避ける）
                   ability_scores: abilitiesForMock.reduce<Record<string, number>>((acc, a) => {
                     acc[a.id] = 0;
                     return acc;
                   }, {}),
                   ability_points: abilitiesForMock.reduce<Record<string, number>>((acc, a) => {
                     acc[a.id] = 0;
                     return acc;
                   }, {}),
                 }))
               : Array.from({ length: 20 }).map((_, i) => ({
                   student_id: `student-${i}`,
                   student_name: `生徒${i + 1}`,
                   grade: 3,
                   class_name: 'A',
                   ability_scores: abilitiesForMock.reduce<Record<string, number>>((acc, a) => {
                     acc[a.id] = Math.floor(Math.random() * 20);
                     return acc;
                   }, {}),
                   ability_points: abilitiesForMock.reduce<Record<string, number>>((acc, a) => {
                     acc[a.id] = Math.floor(Math.random() * 100);
                     return acc;
                   }, {}),
                 }))
           };
           setData(mockData);
           if (mockData.abilities.length >= 1) setSelectedAbility(mockData.abilities[0].id);
        }

      } catch (err) {
        console.error('Failed to fetch scatter data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Note: students prop is used for filtering, not fetching
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studentMap = useMemo(() => {
    if (!students) return null;
    return new Map(students.map((s) => [s.id, s]));
  }, [students]);

  const chartData = useMemo(() => {
    if (!data || !selectedAbility) return [];

    const points = studentMap ? data.data_points.filter((p) => studentMap.has(p.student_id)) : data.data_points;

    return points.map((point) => {
      const s = studentMap?.get(point.student_id);
      return {
      x: point.ability_scores[selectedAbility] || 0, // 報告回数
      y: (point.ability_points?.[selectedAbility]) || 0, // ポイント
      student_id: point.student_id,
      student_name: s?.name ?? point.student_name,
      grade: s?.grade ?? point.grade,
      class_name: s?.class_name ?? point.class_name,
      };
    });
  }, [data, selectedAbility, studentMap]);

  const getAbilityName = (abilityId: string) => {
    return data?.abilities.find((a) => a.id === abilityId)?.name || '';
  };

  const colors = [
    '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
    '#14b8a6', '#22c55e', '#eab308', '#f97316',
  ];

  const handlePointClick = (point: { student_id: string }) => {
    if (onStudentClick) {
      onStudentClick(point.student_id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-red-500 font-zen-maru">{error}</p>
      </div>
    );
  }

  if (!data || data.abilities.length < 1) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-brand-text-secondary font-zen-maru">データが不足しています（能力が1つ以上必要です）</p>
      </div>
    );
  }

  if (!data.data_points || data.data_points.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-brand-text-secondary font-zen-maru">データが不足しています（生徒の報告データがありません）</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-zen-maru text-brand-text-secondary">能力:</label>
            <div className="relative">
              <select
                value={selectedAbility}
                onChange={(e) => setSelectedAbility(e.target.value)}
                className="appearance-none bg-white border border-brand-text-card-unselected px-4 py-2 pr-8 rounded-full text-sm font-zen-maru text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                {data.abilities.map((ability) => (
                  <option key={ability.id} value={ability.id}>
                    {ability.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#efedea" />
            <XAxis
              type="number"
              dataKey="x"
              name="報告回数"
              tick={{ fontSize: 10, fontFamily: 'Zen Maru Gothic' }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
              domain={[0, 'dataMax + 1']}
              allowDecimals={false}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="ポイント"
              tick={{ fontSize: 10, fontFamily: 'Zen Maru Gothic' }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
              domain={[0, 'dataMax + 1']}
              allowDecimals={false}
              width={25}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload;
                  return (
                    <div className="bg-white border border-brand-text-card-unselected rounded-xl shadow-lg p-3 font-zen-maru">
                      <p className="font-bold text-brand-primary">{point.student_name}</p>
                      {point.grade && point.class_name && (
                        <p className="text-xs text-brand-text-secondary">
                          {point.grade}年 {point.class_name}組
                        </p>
                      )}
                      <div className="mt-2 text-xs">
                        <p className="text-brand-primary">
                          {getAbilityName(selectedAbility)}（報告回数）: {Math.round(point.x)}
                        </p>
                        <p className="text-brand-primary">
                          {getAbilityName(selectedAbility)}（ポイント）: {Math.round(point.y)}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter
              data={chartData}
              fill="#243a9f"
              onClick={(data) => handlePointClick(data)}
              cursor="pointer"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.8}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="text-center mt-3">
        <Text className="text-xs text-brand-text-secondary">
          ※ 点をタップで生徒詳細へ
        </Text>
      </div>
    </div>
  );
}

