'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateDeliveryTargetAction, deleteDeliveryTargetAction, type UpdateDeliveryTargetInput } from '@/lib/monthly-policies/actions';
import type { MonthlyDeliveryTarget } from '@/types';

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

interface EditDeliveryTargetClientProps {
  target: MonthlyDeliveryTarget;
}

export function EditDeliveryTargetClient({ target }: EditDeliveryTargetClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<UpdateDeliveryTargetInput>({
    brand: target.brand,
    year_month: target.year_month,
    target_panels: target.target_panels,
    base_salary: target.base_salary,
    bonus_for_meeting_target: target.bonus_for_meeting_target,
    note: target.note || '',
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

    const result = await updateDeliveryTargetAction(target.id, formData);

    if (result.success) {
      router.push('/monthly-delivery-targets');
      router.refresh();
    } else {
      setError(result.error || '更新失败');
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除此配置吗？此操作不可撤销。')) {
      return;
    }

    setLoading(true);
    const result = await deleteDeliveryTargetAction(target.id);

    if (result.success) {
      router.push('/monthly-delivery-targets');
      router.refresh();
    } else {
      setError(result.error || '删除失败');
      setLoading(false);
    }
  };

  const formatYearMonth = (ym: string) => {
    const [year, month] = ym.split('-');
    return `${year}年${parseInt(month, 10)}月`;
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Current Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">创建人：</span>
                <span className="text-gray-900">{target.creator?.name || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">创建时间：</span>
                <span className="text-gray-900">{new Date(target.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>

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
                  value={formData.year_month || ''}
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
                  value={formData.brand || ''}
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
                  value={formData.target_panels ?? 0}
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
                  value={formData.base_salary ?? 0}
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
                  value={formData.bonus_for_meeting_target ?? 0}
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
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-6 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              删除配置
            </button>
            <div className="flex gap-4">
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
                {loading ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
