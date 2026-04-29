'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MonthlyDeliveryTarget } from '@/types';

interface DeliveryTargetListClientProps {
  targets: MonthlyDeliveryTarget[];
}

const BRAND_OPTIONS = [
  '天合',
  '正泰',
  '阳光',
  '华为',
  '古瑞瓦特',
  '固德威',
  '首航',
  '爱旭',
  '其他',
];

export function DeliveryTargetListClient({ targets }: DeliveryTargetListClientProps) {
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [yearMonthFilter, setYearMonthFilter] = useState('all');

  // Get unique brands and year_months for filters
  const brands = Array.from(new Set(targets.map((t) => t.brand))).sort();
  const yearMonths = Array.from(new Set(targets.map((t) => t.year_month))).sort().reverse();

  // Filter targets
  const filteredTargets = targets.filter((target) => {
    const matchesSearch =
      target.brand.toLowerCase().includes(search.toLowerCase()) ||
      (target.note && target.note.toLowerCase().includes(search.toLowerCase()));
    const matchesBrand = brandFilter === 'all' || target.brand === brandFilter;
    const matchesYearMonth = yearMonthFilter === 'all' || target.year_month === yearMonthFilter;
    return matchesSearch && matchesBrand && matchesYearMonth;
  });

  // Stats
  const totalTargets = targets.length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTargets = targets.filter((t) => t.year_month === currentMonth).length;

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null || val === 0) return '-';
    return `¥${val.toLocaleString('zh-CN')}`;
  };

  const formatYearMonth = (ym: string) => {
    const [year, month] = ym.split('-');
    return `${year}年${parseInt(month, 10)}月`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">配置总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalTargets}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">本月配置</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{currentMonthTargets}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">涉及品牌</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{brands.length}</div>
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
                placeholder="搜索品牌或备注..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Year Month Filter */}
            <select
              value={yearMonthFilter}
              onChange={(e) => setYearMonthFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">全部月份</option>
              {yearMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {formatYearMonth(ym)}
                </option>
              ))}
            </select>

            {/* Brand Filter */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">全部品牌</option>
              {BRAND_OPTIONS.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  月份
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  品牌
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  送货量目标
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  底薪
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  达标奖励
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  备注
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTargets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无月度达量配置数据
                  </td>
                </tr>
              ) : (
                filteredTargets.map((target) => {
                  const isCurrentMonth = target.year_month === currentMonth;
                  return (
                    <tr key={target.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isCurrentMonth
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formatYearMonth(target.year_month)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">{target.brand}</div>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-900">
                        {target.target_panels > 0 ? `${target.target_panels} 块` : '-'}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-900">
                        {formatCurrency(target.base_salary)}
                      </td>
                      <td className="px-4 py-4 text-right text-green-600 font-medium">
                        {formatCurrency(target.bonus_for_meeting_target)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {target.note || '-'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/monthly-delivery-targets/${target.id}`}
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
          显示 {filteredTargets.length} / {totalTargets} 条配置
        </div>
      </div>
    </div>
  );
}
