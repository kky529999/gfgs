'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getCommissionsAction,
  getCommissionStatsAction,
} from '@/lib/commissions/actions';
import { getAuthInfoAction } from '@/lib/auth/actions';
import { COMMISSION_STATUS_LABELS, COMMISSION_TYPE_LABELS } from '@/types/commission';
import type { CommissionStatus, CommissionType } from '@/types/commission';
import type { CommissionWithRelations } from '@/types/commission';

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<CommissionWithRelations[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    applied: 0,
    approved: 0,
    paid: 0,
    total: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<{ user_id: string; role: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<CommissionType | ''>('');

  useEffect(() => {
    // Get current user info
    getAuthInfoAction().then((result) => {
      if (result.success && result.data) {
        setAuth(result.data);
      }
    });
  }, []);

  useEffect(() => {
    fetchCommissions();
    fetchStats();
  }, [statusFilter, typeFilter]);

  const fetchCommissions = async () => {
    setLoading(true);
    const result = await getCommissionsAction({
      status: statusFilter || undefined,
      commission_type: typeFilter || undefined,
    });

    if (result.success && result.data) {
      setCommissions(result.data);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const result = await getCommissionStatsAction();
    if (result.success && result.data) {
      setStats(result.data);
    }
  };

  const statusColors: Record<CommissionStatus, string> = {
    pending: 'bg-gray-100 text-gray-800',
    applied: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
  };

  const typeColors: Record<CommissionType, string> = {
    entry: 'bg-indigo-100 text-indigo-800',
    closing: 'bg-purple-100 text-purple-800',
  };

  const isAdminOrGM = auth?.role === 'admin' || auth?.role === 'gm';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">提成管理</h1>
          <p className="text-gray-500 mt-1">
            {isAdminOrGM ? '管理所有提成记录' : '我的提成记录'}
          </p>
        </div>
        {isAdminOrGM && (
          <Link
            href="/commissions/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            新建提成
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">待申请</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">已申请</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.applied}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">已审批</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.approved}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">已支付</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.paid}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">总金额</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            ¥{stats.totalAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">状态:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CommissionStatus | '')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全部</option>
              <option value="pending">待申请</option>
              <option value="applied">已申请</option>
              <option value="approved">已审批</option>
              <option value="paid">已支付</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">类型:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CommissionType | '')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">全部</option>
              <option value="entry">进场提成</option>
              <option value="closing">闭环提成</option>
            </select>
          </div>
        </div>
      </div>

      {/* Commissions List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : commissions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无提成记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客户</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">员工</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">金额</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">时间</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/customers/${commission.customer_id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {commission.customer?.name || '未知客户'}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {commission.customer?.phone || '无电话'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {commission.employee?.name || '未知员工'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {commission.employee?.phone || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[commission.commission_type]}`}>
                        {COMMISSION_TYPE_LABELS[commission.commission_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ¥{commission.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[commission.status]}`}>
                        {COMMISSION_STATUS_LABELS[commission.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(commission.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/commissions/${commission.id}`}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                      >
                        查看详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
