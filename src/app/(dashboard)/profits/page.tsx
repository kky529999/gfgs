'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getProfitCalculationsAction,
  getProfitStatsAction,
  getBrandsForFilterAction,
} from '@/lib/profits/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import type { ProfitCalculation } from '@/types';

export default function ProfitsPage() {
  const [calculations, setCalculations] = useState<ProfitCalculation[]>([]);
  const [stats, setStats] = useState<{
    total_revenue: number;
    total_cost: number;
    total_dealer_fee: number;
    total_penalty: number;
    total_net_profit: number;
    customer_count: number;
    avg_profit_per_customer: number;
    brand_stats: Array<{
      brand: string;
      customer_count: number;
      total_revenue: number;
      total_cost: number;
      total_profit: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);

  // Filters
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('');
  const [brands, setBrands] = useState<string[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'list' | 'summary'>('summary');

  useEffect(() => {
    getAuthInfoAction().then((result) => {
      if (result.success && result.data) {
        setAuth(result.data);
      }
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const [calcResult, statsResult, brandsResult] = await Promise.all([
      getProfitCalculationsAction({
        brand: brandFilter || undefined,
        customer_type: customerTypeFilter || undefined,
      }),
      getProfitStatsAction(),
      getBrandsForFilterAction(),
    ]);

    if (calcResult.success && calcResult.data) {
      setCalculations(calcResult.data);
    }

    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }

    if (brandsResult.success && brandsResult.data) {
      setBrands(brandsResult.data);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (auth) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, brandFilter, customerTypeFilter]);

  const isAdminOrGM = auth?.role === 'admin' || auth?.role === 'gm';

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">客户利润</h1>
        <p className="text-gray-500 mt-1">查看各客户的利润计算分析</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">客户总数</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{stats.customer_count}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">品牌收入</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              ¥{stats.total_revenue.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">总成本</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              ¥{stats.total_cost.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">二级商费用</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              ¥{stats.total_dealer_fee.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">净利润</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">
              ¥{stats.total_net_profit.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'summary'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              品牌汇总
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'list'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              客户明细
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">品牌:</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全部品牌</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">客户类型:</label>
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全部</option>
              <option value="direct">直客</option>
              <option value="dealer">二级商客户</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {activeTab === 'summary' && stats && (
          <>
            {stats.brand_stats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无品牌统计数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">品牌</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">客户数</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">品牌收入</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">成本</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">净利润</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">利润率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.brand_stats.map((brand) => (
                      <tr key={brand.brand} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{brand.brand}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{brand.customer_count}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          ¥{brand.total_revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          ¥{brand.total_cost.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-indigo-600 font-medium">
                          ¥{brand.total_profit.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {brand.total_revenue > 0
                            ? `${((brand.total_profit / brand.total_revenue) * 100).toFixed(1)}%`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'list' && (
          <>
            {calculations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">暂无客户利润数据</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客户</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">品牌</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">板数</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">品牌收入</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">成本</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">二级商费</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">净利润</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calculations.map((calc) => (
                      <tr key={calc.customer_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/customers/${calc.customer_id}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            查看详情
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{calc.brand}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              calc.customer_type === 'direct'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {calc.customer_type === 'direct' ? '直客' : '二级商'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{calc.panel_count}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          ¥{calc.brand_revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          ¥{calc.total_cost.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          {calc.dealer_fee > 0 ? `¥${calc.dealer_fee.toLocaleString()}` : '-'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            calc.net_profit >= 0 ? 'text-indigo-600' : 'text-red-600'
                          }`}
                        >
                          ¥{calc.net_profit.toLocaleString()}
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
    </div>
  );
}
