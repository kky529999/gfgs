'use client';

import { useState, useEffect } from 'react';
import {
  getInvoicesAction,
  getInvoiceCustomersAction,
  createInvoiceAction,
  deleteInvoiceAction,
  type CreateInvoiceInput,
} from '@/lib/invoices/actions';
import type { Invoice } from '@/types';

export function InvoicesClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; brand: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [brandFilter, setBrandFilter] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateInvoiceInput>({
    customer_id: '',
    brand: '',
    invoice_no: '',
    amount: '',
    invoice_date: new Date().toISOString().split('T')[0],
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [invoiceRes, customerRes] = await Promise.all([
      getInvoicesAction(brandFilter ? { brand: brandFilter } : undefined),
      getInvoiceCustomersAction(),
    ]);

    if (invoiceRes.success) setInvoices(invoiceRes.data || []);
    if (customerRes.success) setCustomers(customerRes.data || []);
    setLoading(false);
  };

  const handleFilter = () => {
    loadData();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.customer_id) {
      setError('请选择客户');
      return;
    }
    if (!formData.brand.trim()) {
      setError('请输入品牌');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount as unknown as string) <= 0) {
      setError('请输入有效金额');
      return;
    }

    const input: CreateInvoiceInput = {
      customer_id: formData.customer_id,
      brand: formData.brand.trim(),
      invoice_no: formData.invoice_no?.trim() || undefined,
      amount: parseFloat(formData.amount as unknown as string),
      invoice_date: formData.invoice_date || undefined,
      note: formData.note?.trim() || undefined,
    };

    const result = await createInvoiceAction(input);
    if (result.success) {
      setShowForm(false);
      setFormData({
        customer_id: '',
        brand: '',
        invoice_no: '',
        amount: '',
        invoice_date: new Date().toISOString().split('T')[0],
        note: '',
      });
      loadData();
    } else {
      setError(result.error || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此发票记录？')) return;
    const result = await deleteInvoiceAction(id);
    if (result.success) loadData();
  };

  // Stats
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const brands = [...new Set(invoices.map((inv) => inv.brand).filter(Boolean))];

  const brandStats = brands.reduce(
    (acc, brand) => {
      const brandInvoices = invoices.filter((inv) => inv.brand === brand);
      acc[brand] = brandInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || customerId;
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
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">发票总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">发票总金额</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">涉及品牌</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{brands.length}</div>
        </div>
      </div>

      {/* Brand Stats */}
      {Object.keys(brandStats).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">按品牌统计</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(brandStats).map(([brand, amount]) => (
              <div key={brand} className="flex items-center gap-2">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm font-medium">
                  {brand}
                </span>
                <span className="text-gray-900">
                  {amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            placeholder="筛选品牌"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleFilter}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            筛选
          </button>
          {brandFilter && (
            <button
              onClick={() => {
                setBrandFilter('');
                loadData();
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700"
            >
              清除
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setError('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          新增发票
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品牌</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">发票号</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金额</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">开票日期</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无发票记录
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {invoice.customer?.name || invoice.customer_id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                      {invoice.brand}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{invoice.invoice_no || '-'}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {invoice.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{invoice.invoice_date || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{invoice.note || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(invoice.id)}
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

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新增发票</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  客户 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">请选择客户</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.brand ? `(${c.brand})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  品牌 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="如：天合"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">发票号</label>
                <input
                  type="text"
                  value={formData.invoice_no || ''}
                  onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                  placeholder="可选"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金额 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">开票日期</label>
                <input
                  type="date"
                  value={formData.invoice_date || ''}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  value={formData.note || ''}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="可选"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
    </div>
  );
}
