'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Brand } from '@/lib/brands/actions';

interface BrandListClientProps {
  brands: Brand[];
}

export function BrandListClient({ brands }: BrandListClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter brands
  const filteredBrands = brands.filter((brand) => {
    const matchesSearch =
      brand.brand_name.toLowerCase().includes(search.toLowerCase()) ||
      (brand.support_person && brand.support_person.toLowerCase().includes(search.toLowerCase())) ||
      (brand.tech_person && brand.tech_person.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && brand.status === 'active') ||
      (statusFilter === 'inactive' && brand.status === 'inactive');
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalBrands = brands.length;
  const activeBrands = brands.filter((b) => b.status === 'active').length;
  const totalDeposit = brands.reduce((sum, b) => sum + (b.deposit_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">品牌总数</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalBrands}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">合作中</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{activeBrands}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">押金总额</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            ¥{totalDeposit.toLocaleString('zh-CN')}
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
                placeholder="搜索品牌名称、督导或技术..."
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
              <option value="inactive">已停用</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  品牌信息
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  督导经理
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  技术支持
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  押金
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  合同期限
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
              {filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无品牌数据
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{brand.brand_name}</div>
                      {brand.contract_no && (
                        <div className="text-sm text-gray-500">合同号：{brand.contract_no}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{brand.support_person || '-'}</div>
                      <div className="text-sm text-gray-500">{brand.support_phone || '-'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{brand.tech_person || '-'}</div>
                      <div className="text-sm text-gray-500">{brand.tech_phone || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      ¥{(brand.deposit_amount || 0).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {brand.contract_start && brand.contract_end ? (
                        <>
                          {new Date(brand.contract_start).toLocaleDateString('zh-CN')}
                          {' ~ '}
                          {new Date(brand.contract_end).toLocaleDateString('zh-CN')}
                        </>
                      ) : brand.contract_start || brand.contract_end ? (
                        <>
                          {brand.contract_start && new Date(brand.contract_start).toLocaleDateString('zh-CN')}
                          {' ~ '}
                          {brand.contract_end && new Date(brand.contract_end).toLocaleDateString('zh-CN')}
                        </>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          brand.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {brand.status === 'active' ? '合作中' : '已停用'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/brands/${brand.id}`}
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
          显示 {filteredBrands.length} / {totalBrands} 个品牌
        </div>
      </div>
    </div>
  );
}
