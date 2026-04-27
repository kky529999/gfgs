'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBrandPolicyAction, updateBrandPolicyAction, deactivateBrandPolicyAction, type UpdateBrandPolicyInput } from '@/lib/brand-policies/actions';
import type { BrandPolicy } from '@/types';

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

interface EditBrandPolicyPageProps {
  policyId: string;
}

export function EditBrandPolicyClient({ policyId }: EditBrandPolicyPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState<BrandPolicy | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [formData, setFormData] = useState<UpdateBrandPolicyInput>({});

  // Fetch policy data
  useEffect(() => {
    async function fetchPolicy() {
      const result = await getBrandPolicyAction(policyId);
      if (result.success && result.data) {
        setPolicy(result.data);
        setFormData({
          brand: result.data.brand,
          city: result.data.city,
          effective_from: result.data.effective_from,
          effective_to: result.data.effective_to,
          installation_fee: result.data.installation_fee,
          comprehensive_subsidy: result.data.comprehensive_subsidy,
          channel_fee: result.data.channel_fee,
          install_days: result.data.install_days,
          grid_penalty: result.data.grid_penalty,
          monthly_target: result.data.monthly_target,
          inspection_reward: result.data.inspection_reward,
          quality_bond: result.data.quality_bond,
          note: result.data.note,
          is_active: result.data.is_active,
        });
        setInitialized(true);
      } else {
        setError(result.error || '获取政策信息失败');
      }
    }
    fetchPolicy();
  }, [policyId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? null : parseFloat(value) || 0,
      }));
    } else if (name === 'city' || name === 'note' || name === 'grid_penalty') {
      setFormData((prev) => ({
        ...prev,
        [name]: value || null,
      }));
    } else if (name === 'effective_to' && value === '') {
      setFormData((prev) => ({
        ...prev,
        [name]: null,
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

    if (!formData.brand?.trim()) {
      setError('请选择品牌');
      setLoading(false);
      return;
    }
    if (!formData.effective_from) {
      setError('请选择生效日期');
      setLoading(false);
      return;
    }

    const result = await updateBrandPolicyAction(policyId, formData);

    if (result.success) {
      router.push('/brand-policies');
      router.refresh();
    } else {
      setError(result.error || '更新失败');
    }

    setLoading(false);
  };

  const handleDeactivate = async () => {
    if (!confirm('确定要停用此政策吗？停用后将不能再使用。')) {
      return;
    }

    setDeactivating(true);
    setError('');

    const result = await deactivateBrandPolicyAction(policyId);

    if (result.success) {
      router.push('/brand-policies');
      router.refresh();
    } else {
      setError(result.error || '停用失败');
    }

    setDeactivating(false);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">政策不存在</h2>
          <Link href="/brand-policies" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = policy.effective_to && new Date(policy.effective_to) < new Date();

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {policy.brand} 政策详情
          </h1>
          <p className="text-gray-500 mt-1">
            版本 v{policy.version} ·{' '}
            <span className={policy.is_active && !isExpired ? 'text-green-600' : 'text-gray-400'}>
              {policy.is_active && !isExpired ? '生效中' : '已失效'}
            </span>
          </p>
        </div>
        {policy.is_active && !isExpired && (
          <button
            onClick={handleDeactivate}
            disabled={deactivating}
            className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deactivating ? '停用中...' : '停用政策'}
          </button>
        )}
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
                  value={formData.brand || ''}
                  onChange={handleChange}
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  value={formData.effective_from || ''}
                  onChange={handleChange}
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  value={formData.installation_fee ?? 0}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  value={formData.comprehensive_subsidy ?? 0}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  value={formData.channel_fee ?? 0}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  value={formData.monthly_target ?? ''}
                  onChange={handleChange}
                  min="0"
                  placeholder="留空表示无目标"
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  value={formData.inspection_reward ?? 0}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                  value={formData.quality_bond ?? ''}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="留空表示无保证金"
                  disabled={!policy.is_active || isExpired}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={!policy.is_active || isExpired}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Metadata */}
          <div className="text-sm text-gray-500 space-y-1 pt-4 border-t">
            <p>创建时间：{formatDate(policy.created_at)}</p>
            <p>更新时间：{formatDate(policy.updated_at)}</p>
            {policy.creator && (
              <p>创建人：{(policy.creator as any).name || '未知'}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href="/brand-policies"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            {policy.is_active && !isExpired && (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存修改'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
