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
import api from '../lib/api';

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
        const response = await api.get<ScatterDataResponse>('/dashboard/scatter-data');
        setData(response.data);

        // Set default axes to first two abilities
        if (response.data.abilities.length >= 2) {
          setXAxisAbility(response.data.abilities[0].id);
          setYAxisAbility(response.data.abilities[1].id);
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

  // Transform data for recharts
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

  // Color palette for scatter points
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
      <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-center h-[400px]">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.abilities.length < 2) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-center h-[400px]">
        <p className="text-gray-500">散布図を表示するには、2つ以上の能力データが必要です</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-lg font-bold text-gray-800">能力分析散布図</h2>

        <div className="flex flex-wrap gap-3">
          {/* X軸選択 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">X軸:</label>
            <select
              value={xAxisAbility}
              onChange={(e) => setXAxisAbility(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {data.abilities.map((ability) => (
                <option key={ability.id} value={ability.id}>
                  {ability.name}
                </option>
              ))}
            </select>
          </div>

          {/* Y軸選択 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Y軸:</label>
            <select
              value={yAxisAbility}
              onChange={(e) => setYAxisAbility(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
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

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="x"
              name={getAbilityName(xAxisAbility)}
              tick={{ fontSize: 12 }}
              label={{
                value: getAbilityName(xAxisAbility),
                position: 'bottom',
                offset: 40,
                style: { fontSize: 12, fill: '#6b7280' },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={getAbilityName(yAxisAbility)}
              tick={{ fontSize: 12 }}
              label={{
                value: getAbilityName(yAxisAbility),
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12, fill: '#6b7280', textAnchor: 'middle' },
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const point = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="font-bold text-gray-800">{point.student_name}</p>
                      {point.grade && point.class_name && (
                        <p className="text-sm text-gray-500">
                          {point.grade}年 {point.class_name}組
                        </p>
                      )}
                      <div className="mt-2 text-sm">
                        <p className="text-purple-600">
                          {getAbilityName(xAxisAbility)}: {point.x}
                        </p>
                        <p className="text-indigo-600">
                          {getAbilityName(yAxisAbility)}: {point.y}
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
              fill="#8b5cf6"
              onClick={(data) => handlePointClick(data)}
              cursor="pointer"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.7}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        点をクリックすると生徒詳細が表示されます
      </p>
    </div>
  );
}
