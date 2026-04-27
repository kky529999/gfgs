'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrandPolicyAction, type CreateBrandPolicyInput } from '@/lib/brand-policies/actions';

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

const INSTALL_DAYS_OPTIONS = [
  { value: 28, label: '28天（其他品牌）' },
  { value: 43, label: '43天（天合）' },
  { value: 30, label: '30天（默认）' },
];

export default function NewBrandPolicyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateBrandPolicyInput>({
    brand: '',
    city: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: undefined,
    installation_fee: 0,
    comprehensive_subsidy: 0,
    channel_fee: 0,
    install_days: 30,
    grid_penalty: '',
    monthly_target: undefined,
    inspection_reward: 0,
    quality_bond: undefined,
    note: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? undefined : parseFloat(value) || 0,
      }));
    } else if (name === 'city' || name === 'note' || name === 'grid_penalty') {
      setFormData((prev) => ({
        ...prev,
        [name]: value || undefined,
      }));
    } else if (name === 'effective_to' && value === '') {
      setFormData((prev) => ({
        ...prev,
        [name]: undefined,
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
    if (!formData.effective_from) {
      setError('请选择生效日期');
      setLoading(false);
      return;
    }

    const result = await createBrandPolicyAction(formData);

    if (result.success) {
      router.push('/brand-policies');
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
          href="/brand-policies"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新建品牌政策</h1>
          <p className="text-gray-500 mt-1">添加新的品牌安装政策和补贴标准</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  适用范围（城市）
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  placeholder="如：西安市"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Install Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  并网期限（天）
                </label>
                <select
                  name="install_days"
                  value={formData.install_days || 30}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {INSTALL_DAYS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Effective Period */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">有效期</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Effective From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生效日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="effective_from"
                  value={formData.effective_from}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Effective To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  失效日期
                </label>
                <input
                  type="date"
                  name="effective_to"
                  value={formData.effective_to || ''}
                  onChange={handleChange}
                  placeholder="留空表示永久生效"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">留空表示永久生效</p>
              </div>
            </div>
          </div>

          {/* Fees */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">费用标准</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Installation Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  安装费（元/块）
                </label>
                <input
                  type="number"
                  name="installation_fee"
                  value={formData.installation_fee || 0}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Comprehensive Subsidy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  综合补贴（元/kW）
                </label>
                <input
                  type="number"
                  name="comprehensive_subsidy"
                  value={formData.comprehensive_subsidy || 0}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Channel Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  渠道提点（%）
                </label>
                <input
                  type="number"
                  name="channel_fee"
                  value={formData.channel_fee || 0}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Monthly Target */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月度目标（kW）
                </label>
                <input
                  type="number"
                  name="monthly_target"
                  value={formData.monthly_target || ''}
                  onChange={handleChange}
                  min="0"
                  placeholder="留空表示无目标"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Penalties & Rewards */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">考核与保证金</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Grid Penalty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  并网考核说明
                </label>
                <input
                  type="text"
                  name="grid_penalty"
                  value={formData.grid_penalty || ''}
                  onChange={handleChange}
                  placeholder="如：逾期每日扣100元"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Inspection Reward */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  验收奖励（元）
                </label>
                <input
                  type="number"
                  name="inspection_reward"
                  value={formData.inspection_reward || 0}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Quality Bond */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  质量保证金（元）
                </label>
                <input
                  type="number"
                  name="quality_bond"
                  value={formData.quality_bond || ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="留空表示无保证金"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
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
              placeholder="输入备注信息"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/brand-policies"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建政策'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
