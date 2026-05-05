'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrand } from '@/lib/brands/actions';

export default function NewBrandPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    brand_name: '',
    support_person: '',
    support_phone: '',
    tech_person: '',
    tech_phone: '',
    deposit_amount: '',
    contract_no: '',
    contract_start: '',
    contract_end: '',
    status: 'active',
    remark: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const insertData = {
        brand_name: formData.brand_name.trim(),
        support_person: formData.support_person.trim() || null,
        support_phone: formData.support_phone.trim() || null,
        tech_person: formData.tech_person.trim() || null,
        tech_phone: formData.tech_phone.trim() || null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        contract_no: formData.contract_no.trim() || null,
        contract_start: formData.contract_start || null,
        contract_end: formData.contract_end || null,
        status: formData.status,
        remark: formData.remark.trim() || null,
      };

      const result = await createBrand(insertData);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      router.push('/brands');
      router.refresh();
    } catch (err) {
      setError('创建品牌失败，请重试');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/brands"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回品牌列表
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">新建品牌</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm">
        <div className="p-6 space-y-6">
          {/* Brand Name */}
          <div>
            <label htmlFor="brand_name" className="block text-sm font-medium text-gray-700 mb-1">
              品牌名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="brand_name"
              name="brand_name"
              value={formData.brand_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="如：天合、晶科、隆基"
            />
          </div>

          {/* Support Person */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="support_person" className="block text-sm font-medium text-gray-700 mb-1">
                督导经理
              </label>
              <input
                type="text"
                id="support_person"
                name="support_person"
                value={formData.support_person}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="负责人姓名"
              />
            </div>
            <div>
              <label htmlFor="support_phone" className="block text-sm font-medium text-gray-700 mb-1">
                督导电话
              </label>
              <input
                type="tel"
                id="support_phone"
                name="support_phone"
                value={formData.support_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="手机号码"
              />
            </div>
          </div>

          {/* Tech Person */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tech_person" className="block text-sm font-medium text-gray-700 mb-1">
                技术支持
              </label>
              <input
                type="text"
                id="tech_person"
                name="tech_person"
                value={formData.tech_person}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="技术人员姓名"
              />
            </div>
            <div>
              <label htmlFor="tech_phone" className="block text-sm font-medium text-gray-700 mb-1">
                技术电话
              </label>
              <input
                type="tel"
                id="tech_phone"
                name="tech_phone"
                value={formData.tech_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="手机号码"
              />
            </div>
          </div>

          {/* Deposit Amount */}
          <div>
            <label htmlFor="deposit_amount" className="block text-sm font-medium text-gray-700 mb-1">
              押金金额
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
              <input
                type="number"
                id="deposit_amount"
                name="deposit_amount"
                value={formData.deposit_amount}
                onChange={handleChange}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Contract Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="contract_no" className="block text-sm font-medium text-gray-700 mb-1">
                合同编号
              </label>
              <input
                type="text"
                id="contract_no"
                name="contract_no"
                value={formData.contract_no}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="合同号"
              />
            </div>
            <div>
              <label htmlFor="contract_start" className="block text-sm font-medium text-gray-700 mb-1">
                合同开始日期
              </label>
              <input
                type="date"
                id="contract_start"
                name="contract_start"
                value={formData.contract_start}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="contract_end" className="block text-sm font-medium text-gray-700 mb-1">
                合同结束日期
              </label>
              <input
                type="date"
                id="contract_end"
                name="contract_end"
                value={formData.contract_end}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              状态
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="active">合作中</option>
              <option value="inactive">已停用</option>
            </select>
          </div>

          {/* Remark */}
          <div>
            <label htmlFor="remark" className="block text-sm font-medium text-gray-700 mb-1">
              备注
            </label>
            <textarea
              id="remark"
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="其他备注信息..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex items-center justify-end gap-3">
          <Link
            href="/brands"
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '创建中...' : '创建品牌'}
          </button>
        </div>
      </form>
    </div>
  );
}