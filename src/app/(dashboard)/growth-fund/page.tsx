'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getFundStatsAction,
  getMyFundBalanceAction,
  getMyFundTransactionsAction,
  getAllFundBalancesAction,
  getAllFundTransactionsAction,
  createFundTransactionAction,
  getEmployeesForFundAction,
} from '@/lib/growth-fund/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import { FUND_TRANSACTION_LABELS } from '@/types/growth-fund';
import type { FundTransactionType } from '@/types/growth-fund';
import type { FundTransaction, FundTransactionWithRelations } from '@/types/growth-fund';

export default function GrowthFundPage() {
  const [stats, setStats] = useState({ total_balance: 0, total_deposits: 0, total_withdrawals: 0, employee_count: 0 });
  const [myBalance, setMyBalance] = useState<{ balance: number; last_transaction_at: string | null } | null>(null);
  const [myTransactions, setMyTransactions] = useState<FundTransaction[]>([]);
  const [allBalances, setAllBalances] = useState<(any & { employee: { name: string; phone: string } })[]>([]);
  const [allTransactions, setAllTransactions] = useState<FundTransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'balances'>('my');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    employee_id: '',
    amount: '',
    transaction_type: 'deposit' as FundTransactionType,
    note: '',
  });
  const [employees, setEmployees] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isAdminOrGM = auth?.role === 'admin' || auth?.role === 'gm';

  useEffect(() => {
    getAuthInfoAction().then((result) => {
      if (result.success && result.data) {
        setAuth(result.data);
        if (result.data.role === 'admin' || result.data.role === 'gm') {
          setActiveTab('all');
        }
      }
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [auth]);

  const fetchData = async () => {
    setLoading(true);

    // 获取统计数据（全员可见）
    const statsResult = await getFundStatsAction();
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }

    // 获取个人数据
    const balanceResult = await getMyFundBalanceAction();
    if (balanceResult.success && balanceResult.data) {
      setMyBalance(balanceResult.data);
    }

    const txResult = await getMyFundTransactionsAction();
    if (txResult.success && txResult.data) {
      setMyTransactions(txResult.data);
    }

    // 如果是 admin/gm，获取所有数据
    if (isAdminOrGM) {
      const allBalancesResult = await getAllFundBalancesAction();
      if (allBalancesResult.success && allBalancesResult.data) {
        setAllBalances(allBalancesResult.data);
      }

      const allTxResult = await getAllFundTransactionsAction();
      if (allTxResult.success && allTxResult.data) {
        setAllTransactions(allTxResult.data);
      }

      // 获取员工列表
      const employeesResult = await getEmployeesForFundAction();
      if (employeesResult.success && employeesResult.data) {
        setEmployees(employeesResult.data);
      }
    }

    setLoading(false);
  };

  const handleCreateTransaction = async () => {
    if (!newTransaction.employee_id || !newTransaction.amount) {
      setError('请填写完整信息');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await createFundTransactionAction({
      employee_id: newTransaction.employee_id,
      amount: parseFloat(newTransaction.amount),
      transaction_type: newTransaction.transaction_type,
      note: newTransaction.note || undefined,
    });

    if (result.success) {
      setShowNewModal(false);
      setNewTransaction({ employee_id: '', amount: '', transaction_type: 'deposit', note: '' });
      fetchData();
    } else {
      setError(result.error || '创建失败');
    }

    setSubmitting(false);
  };

  const transactionTypeColors: Record<FundTransactionType, string> = {
    deposit: 'text-green-600',
    withdrawal: 'text-red-600',
    adjustment: 'text-blue-600',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">成长基金</h1>
          <p className="text-gray-500 mt-1">
            {isAdminOrGM ? '管理所有员工的成长基金' : '我的成长基金账户'}
          </p>
        </div>
        {isAdminOrGM && (
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            新建交易
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">基金总余额</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            ¥{stats.total_balance.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">总存入</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            ¥{stats.total_deposits.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">总支取</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            ¥{stats.total_withdrawals.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">参与人数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {stats.employee_count}
          </div>
        </div>
      </div>

      {/* My Balance Card */}
      {!isAdminOrGM && myBalance && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="text-sm opacity-80">我的余额</div>
          <div className="text-4xl font-bold mt-2">
            ¥{myBalance.balance.toLocaleString()}
          </div>
          {myBalance.last_transaction_at && (
            <div className="text-sm opacity-70 mt-2">
              最近变动: {new Date(myBalance.last_transaction_at).toLocaleDateString('zh-CN')}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {isAdminOrGM && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'all'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                全部记录
              </button>
              <button
                onClick={() => setActiveTab('balances')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'balances'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                余额汇总
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm">
        {activeTab === 'my' && !isAdminOrGM && (
          <>
            {myTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无交易记录</div>
            ) : (
              <div className="divide-y">
                {myTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${transactionTypeColors[tx.transaction_type]}`}>
                        {tx.transaction_type === 'withdrawal' ? '-' : '+'}¥{Math.abs(tx.amount).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {FUND_TRANSACTION_LABELS[tx.transaction_type]}
                        {tx.note && ` - ${tx.note}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString('zh-CN')}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        余额: ¥{tx.balance_after.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'all' && isAdminOrGM && (
          <>
            {allTransactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无交易记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">员工</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">金额</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">备注</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">时间</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">余额</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {tx.employee?.name || '未知'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {tx.employee?.phone || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${transactionTypeColors[tx.transaction_type]}`}>
                            {FUND_TRANSACTION_LABELS[tx.transaction_type]}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${transactionTypeColors[tx.transaction_type]}`}>
                          {tx.amount > 0 ? '+' : ''}¥{tx.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {tx.note || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(tx.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-500">
                          ¥{tx.balance_after.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'balances' && isAdminOrGM && (
          <>
            {allBalances.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无余额记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">员工</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">电话</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">当前余额</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">最近变动</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allBalances.map((balance) => (
                      <tr key={balance.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {balance.employee?.name || '未知'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {balance.employee?.phone || '无'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600">
                          ¥{balance.balance.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {balance.last_transaction_at
                            ? new Date(balance.last_transaction_at).toLocaleDateString('zh-CN')
                            : '无记录'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* New Transaction Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">新建交易</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  员工 <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTransaction.employee_id}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, employee_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">请选择员工</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  交易类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTransaction.transaction_type}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, transaction_type: e.target.value as FundTransactionType }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="deposit">存入</option>
                  <option value="withdrawal">支取</option>
                  <option value="adjustment">调整余额</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  金额 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, amount: e.target.value }))}
                  min="0"
                  step="0.01"
                  placeholder="输入金额"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <textarea
                  value={newTransaction.note}
                  onChange={(e) => setNewTransaction((prev) => ({ ...prev, note: e.target.value }))}
                  rows={2}
                  placeholder="可选"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setError('');
                  setNewTransaction({ employee_id: '', amount: '', transaction_type: 'deposit', note: '' });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateTransaction}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
