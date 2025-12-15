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

interface AbilityInfo {
  id: string;
  name: string;
  display_order: number;
}

interface ScatterDataPoint {
  student_id: string;
  student_name: string;
  grade: number | null;
  class_name: string | null;
  ability_scores: Record<string, number>;
}

interface ScatterDataResponse {
  abilities: AbilityInfo[];
  data_points: ScatterDataPoint[];
}

interface Props {
  onStudentClick?: (studentId: string) => void;
}

export default function ScatterPlot({ onStudentClick }: Props) {
  const [data, setData] = useState<ScatterDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xAxisAbility, setXAxisAbility] = useState<string>('');
  const [yAxisAbility, setYAxisAbility] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // モックデータを使用するオプションもあるが、一旦APIを呼ぶ
        // エラー時はモックデータにフォールバックするロジックを入れておく
        try {
          const response = await api.get<ScatterDataResponse>('/dashboard/scatter-data');
          setData(response.data);
          if (response.data.abilities.length >= 2) {
            setXAxisAbility(response.data.abilities[0].id);
            setYAxisAbility(response.data.abilities[1].id);
          }
        } catch (apiErr) {
           console.warn('API fetch failed, using mock data', apiErr);
           // Mock Data
           const mockData: ScatterDataResponse = {
             abilities: [
               { id: 'ability1', name: '情報収集', display_order: 1 },
               { id: 'ability2', name: '課題設定', display_order: 2 },
               { id: 'ability3', name: '対話', display_order: 3 },
               { id: 'ability4', name: '実行', display_order: 4 },
             ],
             data_points: Array.from({ length: 20 }).map((_, i) => ({
                student_id: `student-${i}`,
                student_name: `生徒${i + 1}`,
                grade: 3,
                class_name: 'A',
                ability_scores: {
                  ability1: Math.random() * 100,
                  ability2: Math.random() * 100,
                  ability3: Math.random() * 100,
                  ability4: Math.random() * 100,
                }
             }))
           };
           setData(mockData);
           setXAxisAbility(mockData.abilities[0].id);
           setYAxisAbility(mockData.abilities[1].id);
        }

      } catch (err) {
        console.error('Failed to fetch scatter data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!data || !xAxisAbility || !yAxisAbility) return [];

    return data.data_points.map((point) => ({
      x: point.ability_scores[xAxisAbility] || 0,
      y: point.ability_scores[yAxisAbility] || 0,
      student_id: point.student_id,
      student_name: point.student_name,
      grade: point.grade,
      class_name: point.class_name,
    }));
  }, [data, xAxisAbility, yAxisAbility]);

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

  if (!data || data.abilities.length < 2) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-brand-text-secondary font-zen-maru">データが不足しています</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-zen-maru text-brand-text-secondary">X軸:</label>
            <div className="relative">
              <select
                value={xAxisAbility}
                onChange={(e) => setXAxisAbility(e.target.value)}
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

          <div className="flex items-center gap-2">
            <label className="text-sm font-zen-maru text-brand-text-secondary">Y軸:</label>
             <div className="relative">
              <select
                value={yAxisAbility}
                onChange={(e) => setYAxisAbility(e.target.value)}
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

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#efedea" />
            <XAxis
              type="number"
              dataKey="x"
              name={getAbilityName(xAxisAbility)}
              tick={{ fontSize: 12, fontFamily: 'Zen Maru Gothic' }}
              tickLine={false}
              axisLine={{ stroke: '#efedea' }}
              label={{
                value: getAbilityName(xAxisAbility),
                position: 'bottom',
                offset: 0,
                style: { fontSize: 12, fill: '#8e8e93', fontFamily: 'Zen Maru Gothic' },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={getAbilityName(yAxisAbility)}
              tick={{ fontSize: 12, fontFamily: 'Zen Maru Gothic' }}
              tickLine={false}
              axisLine={{ stroke: '#efedea' }}
              label={{
                value: getAbilityName(yAxisAbility),
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fill: '#8e8e93', textAnchor: 'middle', fontFamily: 'Zen Maru Gothic' },
              }}
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
                          {getAbilityName(xAxisAbility)}: {Math.round(point.x)}
                        </p>
                        <p className="text-brand-primary">
                          {getAbilityName(yAxisAbility)}: {Math.round(point.y)}
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

      <Text className="text-xs text-center mt-4">
        散布図上の点を押すと、生徒詳細画面になります
      </Text>
    </div>
  );
}

