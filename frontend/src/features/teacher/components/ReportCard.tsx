import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Card } from '../../../components/ui/Card';
import { Text } from '../../../components/ui/Typography';
import type { Report } from '../../../types';

// Re-export Report type for backward compatibility
export type { Report } from '../../../types';

interface ReportCardProps {
  report: Report;
  showFullDate?: boolean;
}

export function ReportCard({ report, showFullDate = false }: ReportCardProps) {
  const dateFormat = showFullDate ? 'yyyy/MM/dd HH:mm' : 'HH:mm';

  return (
    <Card className="rounded-card shadow-card p-4 border border-[#f3e8ff]/50">
      <div className="flex justify-between items-start mb-2">
        <span className="bg-brand-primary/10 text-brand-primary text-xs px-2 py-1 rounded-full">
          {report.phase_name || '活動報告'}
        </span>
        <Text className="text-xs text-gray-400">
          {format(new Date(report.reported_at), dateFormat, { locale: ja })}
        </Text>
      </div>
      <Text className="text-sm mb-2">{report.content}</Text>
      {report.abilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {report.abilities.map((ability, idx) => (
            <span
              key={idx}
              className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
            >
              {ability}
            </span>
          ))}
        </div>
      )}
      {report.ai_comment && (
        <div className="mt-3 bg-blue-50 rounded-lg p-2">
          <Text className="text-xs text-blue-700">
            <span className="font-medium">AIコメント:</span> {report.ai_comment}
          </Text>
        </div>
      )}
    </Card>
  );
}
