'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getDealerAction,
  updateDealerAction,
  getDealerDepositsAction,
  addDealerDepositAction,
  type UpdateDealerInput,
} from '@/lib/dealers/actions';
import type { Dealer, DealerDeposit } from '@/types';

interface EditDealerPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDealerPage({ params }: EditDealerPageProps) {
  const router = useRouter();
  const [dealerId, setDealerId] = useState<string | null>(null);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [deposits, setDeposits] = useState<DealerDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingDeposit, setAddingDeposit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    contract_no: '',
    contract_start: '',
    contract_end: '',
    deposit_amount: 0,
    fee_per_panel: 0,
    status: 'active' as 'active' | 'terminated',
    note: '',
  });
  const [depositForm, setDepositForm] = useState({
    amount: 0,
    type: 'pay' as 'pay' | 'refund',
    record_date: new Date().toISOString().split('T')[0],
    note: '',
  });

  // Resolve params
  useEffect(() => {
    params.then((p) => setDealerId(p.id));
  }, [params]);

  // Fetch dealer and deposits
  useEffect(() => {
    if (!dealerId) return;

    async function fetchData() {
      if (!dealerId) return;
      setLoading(true);
      const [dealerResult, depositsResult] = await Promise.all([
        getDealerAction(dealerId),
        getDealerDepositsAction(dealerId),
      ]);

      if (dealerResult.success && dealerResult.data) {
        setDealer(dealerResult.data);
        setFormData({
          name: dealerResult.data.name,
          contact: dealerResult.data.contact || '',
          phone: dealerResult.data.phone || '',
          contract_no: dealerResult.data.contract_no || '',
          contract_start: dealerResult.data.contract_start || '',
          contract_end: dealerResult.data.contract_end || '',
          deposit_amount: dealerResult.data.deposit_amount || 0,
          fee_per_panel: dealerResult.data.fee_per_panel || 0,
          status: dealerResult.data.status,
          note: dealerResult.data.note || '',
        });
      } else {
        setError(dealerResult.error || '获取二级商信息失败');
      }

      if (depositsResult.success && depositsResult.data) {
        setDeposits(depositsResult.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [dealerId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value) || 0) : value,
    }));
  };

  const handleDepositChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setDepositForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value) || 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerId) return;

    setSaving(true);
    setError('');
    setSuccess('');

    // Basic validation
    if (!formData.name.trim()) {
      setError('请输入二级商名称');
      setSaving(false);
      return;
    }

    const input: UpdateDealerInput = {
      name: formData.name,
      contact: formData.contact,
      phone: formData.phone,
      contract_no: formData.contract_no,
      contract_start: formData.contract_start || undefined,
      contract_end: formData.contract_end || undefined,
      deposit_amount: formData.deposit_amount,
      fee_per_panel: formData.fee_per_panel,
      status: formData.status,
      note: formData.note,
    };

    const result = await updateDealerAction(dealerId, input);

    if (result.success) {
      setSuccess('二级商信息已更新');
      setDealer((prev) => (prev ? { ...prev, ...input } : null));
      router.refresh();
    } else {
      setError(result.error || '更新失败');
    }

    setSaving(false);
  };

  const handleAddDeposit = async () => {
    if (!dealerId) return;

    if (depositForm.amount <= 0) {
      setError('请输入有效的押金金额');
      return;
    }
    if (!depositForm.record_date) {
      setError('请选择记录日期');
      return;
    }

    setAddingDeposit(true);
    setError('');

    const result = await addDealerDepositAction(dealerId, depositForm);

    if (result.success) {
      setSuccess(depositForm.type === 'pay' ? '押金缴纳记录已添加' : '押金退还记录已添加');
      // Refresh deposits and dealer
      const [depositsResult, dealerResult] = await Promise.all([
        getDealerDepositsAction(dealerId),
        getDealerAction(dealerId),
      ]);
      if (depositsResult.success && depositsResult.data) {
        setDeposits(depositsResult.data);
      }
      if (dealerResult.success && dealerResult.data) {
        setDealer(dealerResult.data);
        setFormData((prev) => ({
          ...prev,
          deposit_amount: dealerResult.data!.deposit_amount || 0,
          deposit_paid: dealerResult.data!.deposit_paid || 0,
        }));
      }
      // Reset form
      setDepositForm({
        amount: 0,
        type: 'pay',
        record_date: new Date().toISOString().split('T')[0],
        note: '',
      });
      router.refresh();
    } else {
      setError(result.error || '添加失败');
    }

    setAddingDeposit(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">二级商不存在</h2>
          <Link href="/dealers" className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block">
            返回二级商列表
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
          href="/dealers"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">编辑二级商</h1>
          <p className="text-gray-500 mt-1">{dealer.name}</p>
        </div>
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

      {/* Main Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                二级商名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Contact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系人
              </label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                联系电话
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Contract No */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                合同编号
              </label>
              <input
                type="text"
                name="contract_no"
                value={formData.contract_no}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Contract Start */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                合同开始日期
              </label>
              <input
                type="date"
                name="contract_start"
                value={formData.contract_start}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Contract End */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                合同结束日期
              </label>
              <input
                type="date"
                name="contract_end"
                value={formData.contract_end}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                押金金额（元）
              </label>
              <input
                type="number"
                name="deposit_amount"
                value={formData.deposit_amount}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Fee Per Panel */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每块板安装费（元）
              </label>
              <input
                type="number"
                name="fee_per_panel"
                value={formData.fee_per_panel}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                合作状态
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="active">合作中</option>
                <option value="terminated">已终止</option>
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              备注
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <Link
              href="/dealers"
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

      {/* Deposit Management */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">押金管理</h2>

        {/* Deposit Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">应缴押金</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              ¥{(dealer.deposit_amount || 0).toLocaleString('zh-CN')}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">已缴押金</div>
            <div className="text-xl font-bold text-green-600 mt-1">
              ¥{dealer.deposit_paid.toLocaleString('zh-CN')}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500">押金状态</div>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  dealer.deposit_status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : dealer.deposit_status === 'partial'
                    ? 'bg-amber-100 text-amber-800'
                    : dealer.deposit_status === 'refunded'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {dealer.deposit_status === 'paid'
                  ? '已缴纳'
                  : dealer.deposit_status === 'partial'
                  ? '部分缴纳'
                  : dealer.deposit_status === 'refunded'
                  ? '已退还'
                  : '未缴纳'}
              </span>
            </div>
          </div>
        </div>

        {/* Add Deposit Form */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">添加押金记录</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">类型</label>
              <select
                name="type"
                value={depositForm.type}
                onChange={handleDepositChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="pay">缴纳</option>
                <option value="refund">退还</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">金额（元）</label>
              <input
                type="number"
                name="amount"
                value={depositForm.amount}
                onChange={handleDepositChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">日期</label>
              <input
                type="date"
                name="record_date"
                value={depositForm.record_date}
                onChange={handleDepositChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddDeposit}
                disabled={addingDeposit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {addingDeposit ? '添加中...' : '添加记录'}
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">备注</label>
            <input
              type="text"
              name="note"
              value={depositForm.note}
              onChange={handleDepositChange}
              placeholder="备注信息（可选）"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Deposit History */}
        {deposits.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">押金记录</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">类型</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">金额</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deposits.map((deposit) => (
                    <tr key={deposit.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Date(deposit.record_date).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            deposit.type === 'pay'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {deposit.type === 'pay' ? '缴纳' : '退还'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                        {deposit.type === 'pay' ? '+' : '-'}¥{deposit.amount.toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{deposit.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
