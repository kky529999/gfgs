'use client';

import { useState } from 'react';
import type { StageKey } from '@/types';
import { STAGE_NAMES, STAGE_ORDER, getNextStageKey } from '@/lib/stages';

interface StageUpdateModalProps {
  currentStage: StageKey;
  customerName: string;
  onClose: () => void;
  onSubmit: (stage: StageKey, notes: string) => Promise<void>;
}

export default function StageUpdateModal({ currentStage, customerName, onClose, onSubmit }: StageUpdateModalProps) {
  const [selectedStage, setSelectedStage] = useState<StageKey>(() => {
    const next = getNextStageKey(currentStage);
    return next ?? currentStage;
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const availableStages = STAGE_ORDER.slice(currentIdx + 1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(selectedStage, notes);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">更新客户阶段</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500">客户</p>
            <p className="font-medium text-gray-900">{customerName}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-2">当前阶段</p>
            <p className="text-sm text-gray-600">→ {STAGE_NAMES[currentStage]}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              更新至
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableStages.map(stage => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setSelectedStage(stage)}
                  className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                    selectedStage === stage
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {STAGE_NAMES[stage]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注（可选）
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="添加备注..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '提交中...' : '确认更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
