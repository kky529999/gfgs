'use client';

import { useState, useEffect } from 'react';
import {
  getSalaryRecordsAction,
  getSalaryEmployeesAction,
  createSalaryRecordAction,
  updateSalaryRecordAction,
  deleteSalaryRecordAction,
  getCommissionsForSalaryAction,
  getGrowthFundForSalaryAction,
  type SalaryRecord,
  type CreateSalaryRecordInput,
} from '@/lib/salary/actions';

export function SalaryClient() {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<SalaryRecord | null>(null);
  const [yearMonth, setYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateSalaryRecordInput>({
    employee_id: '',
    year_month: '',
    base_salary: 0,
    commission_amount: 0,
    growth_fund_amount: 0,
    other_amount: 0,
    note: '',
  });

  const loadEmployees = async () => {
    const res = await getSalaryEmployeesAction();
    if (res.success) setEmployees(res.data || []);
  };

  const loadRecords = async () => {
    setLoading(true);
    const res = await getSalaryRecordsAction(yearMonth);
    if (res.success) setRecords(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [yearMonth]);

  const handleOpenForm = (record?: SalaryRecord) => {
    setError('');
    if (record) {
      setEditTarget(record);
      setFormData({
        employee_id: record.employee_id,
        year_month: record.year_month,
        base_salary: record.base_salary,
        commission_amount: record.commission_amount,
        growth_fund_amount: record.growth_fund_amount,
        other_amount: record.other_amount,
        note: record.note || '',
      });
    } else {
      setEditTarget(null);
      setFormData({
        employee_id: '',
        year_month: yearMonth,
        base_salary: 0,
        commission_amount: 0,
        growth_fund_amount: 0,
        other_amount: 0,
        note: '',
      });
    }
    setShowForm(true);
  };

  const handleAutoFill = async () => {
    if (!formData.employee_id) {
      setError('请先选择员工');
      return;
    }

    const [commRes, fundRes] = await Promise.all([
      getCommissionsForSalaryAction(yearMonth),
      getGrowthFundForSalaryAction(yearMonth),
    ]);

    const commission = commRes.data?.find((c) => c.employee_id === formData.employee_id);
    const fund = fundRes.data?.find((f) => f.employee_id === formData.employee_id);

    setFormData((prev) => ({
      ...prev,
      commission_amount: commission?.total || 0,
      growth_fund_amount: fund?.total || 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.employee_id) {
      setError('请选择员工');
      return;
    }

    if (formData.base_salary < 0) {
      setError('底薪不能为负数');
      return;
    }

    const result = editTarget
      ? await updateSalaryRecordAction(editTarget.id, formData)
      : await createSalaryRecordAction(formData);

    if (result.success) {
      setShowForm(false);
      setEditTarget(null);
      loadRecords();
    } else {
      setError(result.error || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此薪资记录？')) return;
    const result = await deleteSalaryRecordAction(id);
    if (result.success) loadRecords();
  };

  // Stats
  const totalBase = records.reduce((sum, r) => sum + r.base_salary, 0);
  const totalCommission = records.reduce((sum, r) => sum + r.commission_amount, 0);
  const totalFund = records.reduce((sum, r) => sum + r.growth_fund_amount, 0);
  const totalOther = records.reduce((sum, r) => sum + r.other_amount, 0);
  const total = records.reduce((sum, r) => sum + r.total, 0);

  const availableMonths = (() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  })();

  const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${y}年${parseInt(m)}月`;
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
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleOpenForm()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            新增薪资记录
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-subtle transition-all duration-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">底薪合计</p>
          <p className="text-xl font-semibold text-gray-900 mt-1.5 tracking-tight">
            {totalBase.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-subtle transition-all duration-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">提成合计</p>
          <p className="text-xl font-semibold text-green-600 mt-1.5 tracking-tight">
            {totalCommission.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-subtle transition-all duration-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">成长基金</p>
          <p className="text-xl font-semibold text-orange-600 mt-1.5 tracking-tight">
            {totalFund.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-subtle transition-all duration-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide">其他</p>
          <p className="text-xl font-semibold text-purple-600 mt-1.5 tracking-tight">
            {totalOther.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
          <p className="text-xs text-indigo-600 uppercase tracking-wide">应发合计</p>
          <p className="text-xl font-semibold text-indigo-700 mt-1.5 tracking-tight">
            {total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">员工</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">底薪</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">提成</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">成长基金</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">其他</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">应发</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  暂无薪资记录
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {record.employee?.name || record.employee_id}
                    </div>
                    <div className="text-xs text-gray-500">{record.employee?.title}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {record.base_salary.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">
                    {record.commission_amount > 0
                      ? `+${record.commission_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                      : '0.00'}{' '}
                    元
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-orange-600">
                    {record.growth_fund_amount !== 0
                      ? `${record.growth_fund_amount > 0 ? '+' : ''}${record.growth_fund_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                      : '0.00'}{' '}
                    元
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-purple-600">
                    {record.other_amount !== 0
                      ? `${record.other_amount > 0 ? '+' : ''}${record.other_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                      : '0.00'}{' '}
                    元
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-indigo-600">
                    {record.total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 元
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {record.note || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenForm(record)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm mr-2"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">
              {editTarget ? '编辑薪资记录' : '新增薪资记录'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
              )}

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    员工 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    disabled={!!editTarget}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    <option value="">请选择员工</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.title})
                      </option>
                    ))}
                  </select>
                </div>
                {!editTarget && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAutoFill}
                      className="px-4 py-2 border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50"
                    >
                      自动填充
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    底薪 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">提成</label>
                  <input
                    type="number"
                    value={formData.commission_amount}
                    onChange={(e) => setFormData({ ...formData, commission_amount: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">成长基金</label>
                  <input
                    type="number"
                    value={formData.growth_fund_amount}
                    onChange={(e) => setFormData({ ...formData, growth_fund_amount: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">其他</label>
                  <input
                    type="number"
                    value={formData.other_amount}
                    onChange={(e) => setFormData({ ...formData, other_amount: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">应发合计</span>
                  <span className="text-xl font-bold text-indigo-600">
                    {(
                      formData.base_salary +
                      (formData.commission_amount || 0) +
                      (formData.growth_fund_amount || 0) +
                      (formData.other_amount || 0)
                    ).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    元
                  </span>
                </div>
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
                  onClick={() => {
                    setShowForm(false);
                    setEditTarget(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editTarget ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
