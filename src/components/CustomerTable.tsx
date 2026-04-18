'use client';

import Link from 'next/link';
import type { CustomerWithDeadline } from '@/types';
import StageTag from './StageTag';
import DeadlineBadge from './DeadlineBadge';
import { STAGE_NAMES } from '@/lib/stages';

interface CustomerTableProps {
  customers: CustomerWithDeadline[];
  loading?: boolean;
}

export default function CustomerTable({ customers, loading }: CustomerTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm">暂无客户数据</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">序号</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">客户名称</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">地区</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">品牌</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">当前阶段</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">期限状态</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">业务员</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-400">{c.serial_number ?? '—'}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/customers/${c.id}`}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {c.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-600">{c.region ?? '—'}</td>
              <td className="px-4 py-3 text-gray-600">{c.brand ?? '—'}</td>
              <td className="px-4 py-3">
                <StageTag stage={c.current_stage} />
              </td>
              <td className="px-4 py-3">
                <DeadlineBadge
                  remainingDays={c.remaining_days}
                  deadline={c.deadline}
                  status={c.status}
                />
              </td>
              <td className="px-4 py-3 text-gray-600">
                {c.salesperson?.name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
