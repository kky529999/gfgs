'use client';

import type { StageHistory } from '@/types';
import { STAGE_NAMES } from '@/lib/stages';
import StageTag from './StageTag';
import type { StageKey } from '@/types';

interface StageTimelineProps {
  history: StageHistory[];
  currentStage: StageKey;
}

export default function StageTimeline({ history, currentStage }: StageTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <svg className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">暂无历史记录</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
      <div className="space-y-4">
        {history.map((entry, i) => {
          const isLast = i === 0;
          const isCurrent = entry.stage_key === currentStage && !entry.exited_at;
          return (
            <div key={entry.id} className="relative pl-10">
              <div className={`absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 ${
                isCurrent ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
              }`} />
              <div className={`rounded-lg border p-3 ${
                isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <StageTag stage={entry.stage_key} />
                    {isCurrent && (
                      <span className="text-xs font-medium text-blue-600">进行中</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{entry.entered_at}</span>
                </div>
                {entry.notes && (
                  <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
