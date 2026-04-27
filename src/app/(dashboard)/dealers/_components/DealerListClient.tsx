'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Dealer } from '@/types';

interface DealerListClientProps {
  dealers: Dealer[];
}

export function DealerListClient({ dealers }: DealerListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'terminated'>('all');
  const [depositFilter, setDepositFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid' | 'refunded'>('all');

  // Filter dealers
  const filteredDealers = dealers.filter((dealer) => {
    const matchesSearch =
      dealer.name.toLowerCase().includes(search.toLowerCase()) ||
      (dealer.phone && dealer.phone.includes(search)) ||
      (dealer.contact && dealer.contact.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && dealer.status === 'active') ||
      (statusFilter === 'terminated' && dealer.status === 'terminated');
    const matchesDeposit =
      depositFilter === 'all' || dealer.deposit_status === depositFilter;
    return matchesSearch && matchesStatus && matchesDeposit;
  });

  // Stats
  const totalDealers = dealers.length;
  const activeDealers = dealers.filter((d) => d.status === 'active').length;
  const totalDepositAmount = dealers.reduce((sum, d) => sum + (d.deposit_amount || 0), 0);
  const totalDepositPaid = dealers.reduce((sum, d) => sum + (d.deposit_paid || 0), 0);

  const depositStatusLabels: Record<string, { label: string; className: string }> = {
    unpaid: { label: '未缴纳', className: 'bg-gray-100 text-gray-800' },
    partial: { label: '部分缴纳', className: 'bg-amber-100 text-amber-800' },
    paid: { label: '已缴纳', className: 'bg-green-100 text-green-800' },
    refunded: { label: '已退还', className: 'bg-blue-100 text-blue-800' },
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">二级商总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalDealers}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">合作中</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{activeDealers}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">应缴押金总额</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            ¥{totalDepositAmount.toLocaleString('zh-CN')}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">已缴押金总额</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            ¥{totalDepositPaid.toLocaleString('zh-CN')}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="搜索名称、联系人或电话..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">全部状态</option>
              <option value="active">合作中</option>
              <option value="terminated">已终止</option>
            </select>

            {/* Deposit Filter */}
            <select
              value={depositFilter}
              onChange={(e) => setDepositFilter(e.target.value as typeof depositFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">全部押金</option>
              <option value="unpaid">未缴纳</option>
              <option value="partial">部分缴纳</option>
              <option value="paid">已缴纳</option>
              <option value="refunded">已退还</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  二级商信息
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  联系方式
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  合同信息
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  押金状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    暂无二级商数据
                  </td>
                </tr>
              ) : (
                filteredDealers.map((dealer) => (
                  <tr key={dealer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{dealer.name}</div>
                      {dealer.contract_no && (
                        <div className="text-sm text-gray-500">合同号：{dealer.contract_no}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{dealer.contact || '-'}</div>
                      <div className="text-sm text-gray-500">{dealer.phone || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {dealer.contract_start && dealer.contract_end ? (
                        <>
                          {new Date(dealer.contract_start).toLocaleDateString('zh-CN')}
                          {' ~ '}
                          {new Date(dealer.contract_end).toLocaleDateString('zh-CN')}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            dealer.deposit_status
                              ? depositStatusLabels[dealer.deposit_status]?.className || 'bg-gray-100 text-gray-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {dealer.deposit_status
                            ? depositStatusLabels[dealer.deposit_status]?.label || dealer.deposit_status
                            : '未设置'}
                        </span>
                        <div className="text-xs text-gray-500">
                          ¥{(dealer.deposit_paid || 0).toLocaleString('zh-CN')} / ¥{(dealer.deposit_amount || 0).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dealer.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {dealer.status === 'active' ? '合作中' : '已终止'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dealers/${dealer.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          详情/编辑
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          显示 {filteredDealers.length} / {totalDealers} 家二级商
        </div>
      </div>
    </div>
  );
}
