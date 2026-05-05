'use client';

import { useState, useEffect } from 'react';
import { getStageConfigs, updateStageConfig, StageConfig } from '@/lib/config/stage-config';

const STAGE_ORDER = [
  'survey',
  'design',
  'filing',
  'record',
  'grid_materials',
  'ship',
  'grid',
  'close',
];

const STAGE_ICONS: Record<string, React.ReactNode> = {
  survey: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  design: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  filing: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  record: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  ),
  grid_materials: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  ship: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  grid: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function StageConfigPage() {
  const [configs, setConfigs] = useState<StageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editValues, setEditValues] = useState<Record<string, { default_days: number; description: string }>>({});

  useEffect(() => {
    async function fetchConfigs() {
      const result = await getStageConfigs();
      if (result.error) {
        setError(result.error);
      } else {
        setConfigs(result.data || []);
        const values: Record<string, { default_days: number; description: string }> = {};
        for (const config of result.data || []) {
          values[config.stage_key] = {
            default_days: config.default_days,
            description: config.description || '',
          };
        }
        setEditValues(values);
      }
      setLoading(false);
    }
    fetchConfigs();
  }, []);

  const handleChange = (stageKey: string, field: 'default_days' | 'description', value: string | number) => {
    setEditValues((prev) => ({
      ...prev,
      [stageKey]: {
        ...prev[stageKey],
        [field]: field === 'default_days' ? Number(value) : value,
      },
    }));
  };

  const handleSave = async (stageKey: string) => {
    setSaving(stageKey);
    setError('');
    setSuccess('');

    const result = await updateStageConfig(stageKey, {
      default_days: editValues[stageKey]?.default_days || 7,
      description: editValues[stageKey]?.description,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(`${result.data?.stage_name} 配置已保存`);
      setConfigs((prev) =>
        prev.map((c) => (c.stage_key === stageKey ? result.data! : c))
      );
    }
    setSaving(null);
  };

  const sortedConfigs = [...configs].sort((a, b) => {
    const indexA = STAGE_ORDER.indexOf(a.stage_key);
    const indexB = STAGE_ORDER.indexOf(b.stage_key);
    return indexA - indexB;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">环节时效配置</h1>
        <p className="text-gray-500 mt-1">配置客户生命周期各阶段的默认时效天数</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Stage Config Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedConfigs.map((config) => (
          <div key={config.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                {STAGE_ICONS[config.stage_key] || STAGE_ICONS.survey}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{config.stage_name}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {config.stage_key}
                  </span>
                </div>

                {/* Days Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    默认时效（天）
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={editValues[config.stage_key]?.default_days || config.default_days}
                      onChange={(e) =>
                        handleChange(config.stage_key, 'default_days', e.target.value)
                      }
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-gray-500 text-sm">天</span>
                  </div>
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    说明
                  </label>
                  <input
                    type="text"
                    value={editValues[config.stage_key]?.description || config.description || ''}
                    onChange={(e) =>
                      handleChange(config.stage_key, 'description', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="阶段说明..."
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSave(config.stage_key)}
                    disabled={saving === config.stage_key}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {saving === config.stage_key ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium text-amber-800">注意事项</p>
            <ul className="text-sm text-amber-700 mt-1 space-y-1">
              <li>• 天合品牌并网截止为 43 天，此配置不适用</li>
              <li>• 其他品牌并网截止默认使用此配置（28 天）</li>
              <li>• 修改后对新客户立即生效</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
