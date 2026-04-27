'use client';

import { useState, useEffect } from 'react';
import {
  getBrandDepositsAction,
  getDealerDepositsAction,
  getActiveDealersAction,
  createBrandDepositAction,
  createDealerDepositAction,
  refundBrandDepositAction,
  deleteBrandDepositAction,
  deleteDealerDepositAction,
  type CreateBrandDepositInput,
  type CreateDealerDepositInput,
} from '@/lib/deposits/actions';
import type { BrandDeposit, DealerDeposit, Dealer } from '@/types';
import { revalidatePath } from 'next/navigation';

type Tab = 'brand' | 'dealer';

interface BrandDepositFormData {
  brand: string;
  amount: string;
  pay_date: string;
  note: string;
}

interface DealerDepositFormData {
  dealer_id: string;
  amount: string;
  type: 'pay' | 'refund';
  record_date: string;
  note: string;
}

export function DepositsClient() {
  const [activeTab, setActiveTab] = useState<Tab>('brand');
  const [brandDeposits, setBrandDeposits] = useState<BrandDeposit[]>([]);
  const [dealerDeposits, setDealerDeposits] = useState<DealerDeposit[]>([]);
  const [dealers, setDealers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [showDealerForm, setShowDealerForm] = useState(false);
  const [refundTarget, setRefundTarget] = useState<BrandDeposit | null>(null);
  const [refundAmount, setRefundAmount] = useState('');

  const [brandForm, setBrandForm] = useState<BrandDepositFormData>({
    brand: '',
    amount: '',
    pay_date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const [dealerForm, setDealerForm] = useState<DealerDepositFormData>({
    dealer_id: '',
    amount: '',
    type: 'pay',
    record_date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [brandRes, dealerRes, dealersRes] = await Promise.all([
      getBrandDepositsAction(),
      getDealerDepositsAction(),
      getActiveDealersAction(),
    ]);

    if (brandRes.success) setBrandDeposits(brandRes.data || []);
    if (dealerRes.success) setDealerDeposits(dealerRes.data || []);
    if (dealersRes.success) setDealers(dealersRes.data || []);
    setLoading(false);
  };

  const handleCreateBrandDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!brandForm.brand.trim()) {
      setError('请输入品牌名称');
      return;
    }
    if (!brandForm.amount || parseFloat(brandForm.amount) <= 0) {
      setError('请输入有效金额');
      return;
    }

    const input: CreateBrandDepositInput = {
      brand: brandForm.brand.trim(),
      amount: parseFloat(brandForm.amount),
      pay_date: brandForm.pay_date || undefined,
      note: brandForm.note.trim() || undefined,
    };

    const result = await createBrandDepositAction(input);
    if (result.success) {
      setShowBrandForm(false);
      setBrandForm({ brand: '', amount: '', pay_date: new Date().toISOString().split('T')[0], note: '' });
      loadData();
    } else {
      setError(result.error || '创建失败');
    }
  };

  const handleCreateDealerDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dealerForm.dealer_id) {
      setError('请选择二级商');
      return;
    }
    if (!dealerForm.amount || parseFloat(dealerForm.amount) <= 0) {
      setError('请输入有效金额');
      return;
    }

    const input: CreateDealerDepositInput = {
      dealer_id: dealerForm.dealer_id,
      amount: parseFloat(dealerForm.amount),
      type: dealerForm.type,
      record_date: dealerForm.record_date || undefined,
      note: dealerForm.note.trim() || undefined,
    };

    const result = await createDealerDepositAction(input);
    if (result.success) {
      setShowDealerForm(false);
      setDealerForm({ dealer_id: '', amount: '', type: 'pay', record_date: new Date().toISOString().split('T')[0], note: '' });
      loadData();
    } else {
      setError(result.error || '创建失败');
    }
  };

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;

    const amount = parseFloat(refundAmount);
    if (!amount || amount <= 0) {
      setError('请输入有效退还金额');
      return;
    }

    const remaining = refundTarget.amount - (refundTarget.refunded || 0);
    if (amount > remaining) {
      setError(`最多可退还 ${remaining.toFixed(2)} 元`);
      return;
    }

    const result = await refundBrandDepositAction(refundTarget.id, amount);
    if (result.success) {
      setRefundTarget(null);
      setRefundAmount('');
      loadData();
    } else {
      setError(result.error || '退还失败');
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('确定删除此品牌押金记录？')) return;
    const result = await deleteBrandDepositAction(id);
    if (result.success) loadData();
  };

  const handleDeleteDealer = async (id: string) => {
    if (!confirm('确定删除此二级商押金记录？')) return;
    const result = await deleteDealerDepositAction(id);
    if (result.success) loadData();
  };

  // Stats
  const totalBrandDeposit = brandDeposits.reduce((sum, d) => sum + d.amount, 0);
  const totalBrandRefunded = brandDeposits.reduce((sum, d) => sum + (d.refunded || 0), 0);

  const dealerStats = dealerDeposits.reduce(
    (acc, d) => {
      if (d.type === 'pay') acc.paid += d.amount;
      else acc.refunded += d.amount;
      return acc;
    },
    { paid: 0, refunded: 0 }
  );

  const getDealerName = (dealerId: string) => {
    const dealer = dealers.find((d) => d.id === dealerId);
    return dealer?.name || dealerId;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      partial_refund: 'bg-yellow-100 text-yellow-800',
      refunded: 'bg-gray-100 text-gray-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      paid: '已缴',
      partial_refund: '部分退还',
      refunded: '已退还',
      unpaid: '未缴',
      partial: '部分缴纳',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">我方交品牌押金</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {totalBrandDeposit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">品牌押金已退还</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {totalBrandRefunded.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">二级商缴纳押金</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {dealerStats.paid.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">已退还二级商</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {dealerStats.refunded.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('brand')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'brand'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            品牌押金（我方 → 品牌方）
          </button>
          <button
            onClick={() => setActiveTab('dealer')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dealer'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            二级商押金（二级商 → 我方）
          </button>
        </nav>
      </div>

      {/* Brand Deposits */}
      {activeTab === 'brand' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowBrandForm(true);
                setError('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新增品牌押金
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品牌</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">押金金额</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">已退还</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">剩余</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">缴纳日期</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {brandDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      暂无品牌押金记录
                    </td>
                  </tr>
                ) : (
                  brandDeposits.map((deposit) => {
                    const remaining = deposit.amount - (deposit.refunded || 0);
                    return (
                      <tr key={deposit.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{deposit.brand}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {deposit.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">
                          {(deposit.refunded || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-orange-600">
                          {remaining.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {deposit.pay_date || '-'}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(deposit.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {deposit.note || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {remaining > 0 && (
                            <button
                              onClick={() => {
                                setRefundTarget(deposit);
                                setRefundAmount('');
                                setError('');
                              }}
                              className="text-green-600 hover:text-green-800 text-sm mr-2"
                            >
                              退还
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBrand(deposit.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dealer Deposits */}
      {activeTab === 'dealer' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowDealerForm(true);
                setError('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新增二级商押金记录
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">二级商</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金额</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dealerDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      暂无二级商押金记录
                    </td>
                  </tr>
                ) : (
                  dealerDeposits.map((deposit) => (
                    <tr key={deposit.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {deposit.dealer?.name || deposit.dealer_id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            deposit.type === 'pay'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {deposit.type === 'pay' ? '缴纳' : '退还'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {deposit.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{deposit.record_date}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {deposit.creator?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {deposit.note || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteDealer(deposit.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Brand Deposit Modal */}
      {showBrandForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新增品牌押金</h3>
            <form onSubmit={handleCreateBrandDeposit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  品牌名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={brandForm.brand}
                  onChange={(e) => setBrandForm({ ...brandForm, brand: e.target.value })}
                  placeholder="如：天合"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  押金金额 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={brandForm.amount}
                  onChange={(e) => setBrandForm({ ...brandForm, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">缴纳日期</label>
                <input
                  type="date"
                  value={brandForm.pay_date}
                  onChange={(e) => setBrandForm({ ...brandForm, pay_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={brandForm.note}
                  onChange={(e) => setBrandForm({ ...brandForm, note: e.target.value })}
                  placeholder="可选"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBrandForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dealer Deposit Modal */}
      {showDealerForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新增二级商押金记录</h3>
            <form onSubmit={handleCreateDealerDeposit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  二级商 <span className="text-red-500">*</span>
                </label>
                <select
                  value={dealerForm.dealer_id}
                  onChange={(e) => setDealerForm({ ...dealerForm, dealer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">请选择</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  类型 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="depositType"
                      value="pay"
                      checked={dealerForm.type === 'pay'}
                      onChange={() => setDealerForm({ ...dealerForm, type: 'pay' })}
                      className="mr-2"
                    />
                    缴纳押金
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="depositType"
                      value="refund"
                      checked={dealerForm.type === 'refund'}
                      onChange={() => setDealerForm({ ...dealerForm, type: 'refund' })}
                      className="mr-2"
                    />
                    退还押金
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金额 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={dealerForm.amount}
                  onChange={(e) => setDealerForm({ ...dealerForm, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input
                  type="date"
                  value={dealerForm.record_date}
                  onChange={(e) => setDealerForm({ ...dealerForm, record_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={dealerForm.note}
                  onChange={(e) => setDealerForm({ ...dealerForm, note: e.target.value })}
                  placeholder="可选"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDealerForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">退还 {refundTarget.brand} 押金</h3>
            <form onSubmit={handleRefund} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
              )}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">押金总额</span>
                  <span className="font-medium">{refundTarget.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">已退还</span>
                  <span className="font-medium text-green-600">
                    {(refundTarget.refunded || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">可退还</span>
                  <span className="font-bold text-orange-600">
                    {(refundTarget.amount - (refundTarget.refunded || 0)).toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  本次退还金额 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={(refundTarget.amount - (refundTarget.refunded || 0)).toFixed(2)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  确认退还
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
