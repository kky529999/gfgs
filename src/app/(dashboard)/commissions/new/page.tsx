'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createCommissionAction,
  calculateCommissionAction,
} from '@/lib/commissions/actions';
import { getCustomersAction } from '@/lib/customers/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import { COMMISSION_TYPE_LABELS } from '@/types/commission';
import type { CommissionType } from '@/types/commission';
import type { Customer } from '@/types/customer';

export default function NewCommissionPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
  const [calculationBreakdown, setCalculationBreakdown] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    commission_type: 'entry' as CommissionType,
    amount: '',
    note: '',
  });

  useEffect(() => {
    getAuthInfoAction().then((result) => {
      if (result.success && result.data) {
        setAuth(result.data);
        // 只有 admin 和 gm 可以访问此页面
        if (result.data.role !== 'admin' && result.data.role !== 'gm') {
          router.push('/commissions');
        }
      }
    });

    // 加载客户列表
    getCustomersAction().then((result) => {
      if (result.success && result.data) {
        setCustomers(result.data);
      }
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 如果选择了客户和类型，自动计算
    if (name === 'customer_id' || name === 'commission_type') {
      setCalculatedAmount(null);
      setCalculationBreakdown('');
    }
  };

  const handleCalculate = async () => {
    if (!formData.customer_id || !formData.commission_type) {
      setError('请先选择客户和提成类型');
      return;
    }

    setCalculating(true);
    setError('');

    const result = await calculateCommissionAction({
      customer_id: formData.customer_id,
      commission_type: formData.commission_type,
    });

    if (result.success && result.data) {
      setCalculatedAmount(result.data.amount);
      setCalculationBreakdown(result.data.breakdown);
      setFormData((prev) => ({ ...prev, amount: result.data!.amount.toString() }));
    } else {
      setError(result.error || '计算失败');
    }

    setCalculating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_id) {
      setError('请选择客户');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('请输入有效的提成金额');
      return;
    }

    setLoading(true);

    const result = await createCommissionAction({
      customer_id: formData.customer_id,
      commission_type: formData.commission_type,
      amount: parseFloat(formData.amount),
      note: formData.note || undefined,
    });

    if (result.success) {
      router.push('/commissions');
    } else {
      setError(result.error || '创建失败');
    }

    setLoading(false);
  };

  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/commissions"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新建提成</h1>
          <p className="text-gray-500 mt-1">为客户创建提成记录</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              客户 <span className="text-red-500">*</span>
            </label>
            <select
              name="customer_id"
              value={formData.customer_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">请选择客户</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.phone ? `(${customer.phone})` : ''} - {customer.brand || '无品牌'} {customer.capacity ? `(${customer.capacity})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Customer Info */}
          {selectedCustomer && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">客户信息</h4>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-gray-500">品牌</dt>
                  <dd className="text-gray-900">{selectedCustomer.brand || '未填写'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">装机容量</dt>
                  <dd className="text-gray-900">{selectedCustomer.capacity || '未填写'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">当前阶段</dt>
                  <dd className="text-gray-900">{selectedCustomer.current_stage || '未知'}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Commission Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提成类型 <span className="text-red-500">*</span>
            </label>
            <select
              name="commission_type"
              value={formData.commission_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="entry">进场提成</option>
              <option value="closing">闭环提成</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提成金额 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="输入金额"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleCalculate}
                disabled={!formData.customer_id || calculating}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculating ? '计算中...' : '自动计算'}
              </button>
            </div>
            {calculatedAmount !== null && (
              <p className="mt-2 text-sm text-green-600">
                计算结果: ¥{calculatedAmount.toLocaleString()}
                {calculationBreakdown && (
                  <span className="block text-gray-500 mt-1 whitespace-pre-line">
                    {calculationBreakdown}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows={3}
              placeholder="可选，添加备注说明"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end gap-4">
          <Link
            href="/commissions"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '创建中...' : '创建提成'}
          </button>
        </div>
      </form>
    </div>
  );
}
