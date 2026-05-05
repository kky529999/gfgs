'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBrand, updateBrand, deleteBrand } from '@/lib/brands/actions';
import type { Brand } from '@/lib/brands/actions';

interface EditBrandPageProps {
  params: Promise<{ id: string }>;
}

export default function EditBrandPage({ params }: EditBrandPageProps) {
  const router = useRouter();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
    status: 'active' as 'active' | 'inactive',
    remark: '',
  });

  // Resolve params
  useEffect(() => {
    params.then((p) => setBrandId(p.id));
  }, [params]);

  // Fetch brand
  useEffect(() => {
    if (!brandId) return;

    async function fetchBrand() {
      setLoading(true);
      const result = await getBrand(brandId!);

      if (result.data) {
        setBrand(result.data);
        setFormData({
          brand_name: result.data.brand_name,
          support_person: result.data.support_person || '',
          support_phone: result.data.support_phone || '',
          tech_person: result.data.tech_person || '',
          tech_phone: result.data.tech_phone || '',
          deposit_amount: result.data.deposit_amount?.toString() || '',
          contract_no: result.data.contract_no || '',
          contract_start: result.data.contract_start || '',
          contract_end: result.data.contract_end || '',
          status: result.data.status as 'active' | 'inactive',
          remark: result.data.remark || '',
        });
      } else {
        setError(result.error || '获取品牌信息失败');
      }

      setLoading(false);
    }

    fetchBrand();
  }, [brandId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    if (!formData.brand_name.trim()) {
      setError('请输入品牌名称');
      setSaving(false);
      return;
    }

    const result = await updateBrand(brandId, {
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
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('品牌信息已更新');
      setBrand((prev) => (prev ? {
        ...prev,
        brand_name: formData.brand_name,
        support_person: formData.support_person || null,
        support_phone: formData.support_phone || null,
        tech_person: formData.tech_person || null,
        tech_phone: formData.tech_phone || null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        contract_no: formData.contract_no || null,
        contract_start: formData.contract_start || null,
        contract_end: formData.contract_end || null,
        status: formData.status,
        remark: formData.remark || null,
      } : null));
      router.refresh();
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!brandId) return;

    setDeleting(true);
    setError('');

    const result = await deleteBrand(brandId);

    if (result.error) {
      setError(result.error);
      setDeleting(false);
      setShowDeleteConfirm(false);
    } else {
      router.push('/brands');
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">品牌不存在</h2>
          <Link href="/brands" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            返回品牌列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/brands"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">编辑品牌</h1>
          <p className="text-gray-500 mt-1">{brand.brand_name}</p>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          停用品牌
        </button>
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

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认停用品牌</h3>
            <p className="text-gray-600 mb-4">
              确定要停用品牌「{brand.brand_name}」吗？停用后品牌将不再出现在下拉选择中，但历史数据保留。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                disabled={deleting}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? '停用中...' : '确认停用'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
        <div className="space-y-6">
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
            <div className="relative max-w-xs">
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
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
        <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-gray-200">
          <Link
            href="/brands"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}