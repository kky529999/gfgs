import type { StatusColor } from '@/types';

const STATUS_CONFIG: Record<StatusColor, { label: string; bg: string; text: string; dot: string }> = {
  green: { label: '正常', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  yellow: { label: '注意', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  orange: { label: '紧急', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  red: { label: '超期', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

interface DeadlineBadgeProps {
  remainingDays?: number;
  deadline?: string;
  status: StatusColor;
}

export default function DeadlineBadge({ remainingDays, deadline, status }: DeadlineBadgeProps) {
  const config = STATUS_CONFIG[status];
  const isPast = remainingDays !== undefined && remainingDays < 0;
  const isUrgent = remainingDays !== undefined && remainingDays >= 0 && remainingDays < 3;

  return (
    <div className={`inline-flex flex-col items-start gap-0.5 rounded-lg px-3 py-1.5 ${config.bg}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
        <span className={`text-xs font-medium ${config.text}`}>
          {isPast ? `${Math.abs(remainingDays!)}天超期` : remainingDays !== undefined ? `剩余${remainingDays}天` : '无期限'}
        </span>
      </div>
      {deadline && (
        <span className={`text-xs ${config.text} opacity-75`}>至 {deadline}</span>
      )}
    </div>
  );
}
