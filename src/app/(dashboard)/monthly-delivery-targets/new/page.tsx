'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDeliveryTargetAction, type CreateDeliveryTargetInput } from '@/lib/monthly-policies/actions';

const BRAND_OPTIONS = [
  '天合',
  '正泰',
  '阳光',
  '华为',
  '古瑞瓦特',
  '固德威',
  '首航',
  '爱旭',
  '其他',
];

// Get current and next 12 months for selection
function getYearMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = `${year}年${date.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

export default function NewDeliveryTargetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateDeliveryTargetInput>({
    brand: '',
    year_month: new Date().toISOString().slice(0, 7),
    target_panels: 0,
    base_salary: 0,
    bonus_for_meeting_target: 0,
    note: '',
  });

  const yearMonthOptions = getYearMonthOptions();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? 0 : parseFloat(value) || 0,
      }));
    } else if (name === 'note') {
      setFormData((prev) => ({
        ...prev,
        [name]: value || undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.brand.trim()) {
      setError('请选择品牌');
      setLoading(false);
      return;
    }
    if (!formData.year_month) {
      setError('请选择月份');
      setLoading(false);
      return;
    }

    const result = await createDeliveryTargetAction(formData);

    if (result.success) {
      router.push('/monthly-delivery-targets');
      router.refresh();
    } else {
      setError(result.error || '创建失败');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/monthly-delivery-targets"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新建月度达量配置</h1>
          <p className="text-gray-500 mt-1">添加新的品牌月度送货量目标和奖励配置</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Year Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月份 <span className="text-red-500">*</span>
                </label>
                <select
                  name="year_month"
                  value={formData.year_month}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {yearMonthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  品牌 <span className="text-red-500">*</span>
                </label>
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">选择品牌</option>
                  {BRAND_OPTIONS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Targets */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">目标和奖励</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Target Panels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  送货量目标（块）
                </label>
                <input
                  type="number"
                  name="target_panels"
                  value={formData.target_panels || 0}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Base Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  底薪（元）
                </label>
                <input
                  type="number"
                  name="base_salary"
                  value={formData.base_salary || 0}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Bonus for Meeting Target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  达标奖励（元）
                </label>
                <input
                  type="number"
                  name="bonus_for_meeting_target"
                  value={formData.bonus_for_meeting_target || 0}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">达到送货量目标后的额外奖励</p>
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <textarea
              name="note"
              value={formData.note || ''}
              onChange={handleChange}
              placeholder="输入备注信息（可选）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/monthly-delivery-targets"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建配置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
