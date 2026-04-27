'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { BrandPolicy } from '@/types';

interface BrandPolicyListClientProps {
  policies: BrandPolicy[];
}

export function BrandPolicyListClient({ policies }: BrandPolicyListClientProps) {
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Get unique brands for filter
  const brands = Array.from(new Set(policies.map((p) => p.brand))).sort();

  // Filter policies
  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      policy.brand.toLowerCase().includes(search.toLowerCase()) ||
      (policy.city && policy.city.toLowerCase().includes(search.toLowerCase())) ||
      (policy.note && policy.note.toLowerCase().includes(search.toLowerCase()));
    const matchesBrand = brandFilter === 'all' || policy.brand === brandFilter;
    const isExpired = policy.effective_to && new Date(policy.effective_to) < new Date();
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && policy.is_active && !isExpired) ||
      (statusFilter === 'expired' && (isExpired || !policy.is_active));
    return matchesSearch && matchesBrand && matchesStatus;
  });

  // Stats
  const totalPolicies = policies.length;
  const activePolicies = policies.filter((p) => p.is_active && (!p.effective_to || new Date(p.effective_to) >= new Date())).length;

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null || val === 0) return '-';
    return `¥${val.toLocaleString('zh-CN')}`;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">政策总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalPolicies}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">生效中</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{activePolicies}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">涉及品牌</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{brands.length}</div>
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
                placeholder="搜索品牌、城市或备注..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Brand Filter */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">全部品牌</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">全部状态</option>
              <option value="active">生效中</option>
              <option value="expired">已失效</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  品牌
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  有效期
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  安装费
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  综合补贴
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  渠道提点
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  并网考核
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
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    暂无品牌政策数据
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => {
                  const isExpired = policy.effective_to && new Date(policy.effective_to) < new Date();
                  return (
                    <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{policy.brand}</div>
                        {policy.city && (
                          <div className="text-sm text-gray-500">{policy.city}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">v{policy.version}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        <div>{formatDate(policy.effective_from)}</div>
                        <div className="text-xs text-gray-400">
                          ~ {policy.effective_to ? formatDate(policy.effective_to) : '永久'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {formatCurrency(policy.installation_fee)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {formatCurrency(policy.comprehensive_subsidy)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {policy.channel_fee != null && policy.channel_fee > 0
                          ? `${policy.channel_fee}%`
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {policy.grid_penalty || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            policy.is_active && !isExpired
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {policy.is_active && !isExpired ? '生效中' : '已失效'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/brand-policies/${policy.id}`}
                            className="inline-flex items-center px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            详情/编辑
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          显示 {filteredPolicies.length} / {totalPolicies} 条政策
        </div>
      </div>
    </div>
  );
}
