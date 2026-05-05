'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { STAGE_LABELS, STAGE_ORDER, type CustomerStage, type CustomerWithRelations } from '@/types/customer';

type SortField = 'name' | 'brand' | 'current_stage' | 'created_at' | 'salesperson';
type SortDirection = 'asc' | 'desc';

interface CustomerTableProps {
  customers: CustomerWithRelations[];
  canManage: boolean;
}

const SortIcon = ({ field, currentSort, direction }: { field: SortField; currentSort: SortField; direction: SortDirection }) => {
  if (currentSort !== field) {
    return (
      <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
};

export default function CustomerTable({ customers, canManage }: CustomerTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const getStageIndex = (stage: CustomerStage) => STAGE_ORDER.indexOf(stage);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'current_stage':
          comparison = getStageIndex(a.current_stage) - getStageIndex(b.current_stage);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'salesperson':
          comparison = (a.salesperson?.name || '').localeCompare(b.salesperson?.name || '');
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [customers, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-gray-700 transition-colors group"
    >
      {children}
      <SortIcon field={field} currentSort={sortField} direction={sortDirection} />
    </button>
  );

  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">暂无客户</h3>
        <p className="mt-2 text-gray-500">点击上方按钮添加第一个客户</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortableHeader field="name">客户信息</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortableHeader field="salesperson">业务归属</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortableHeader field="brand">品牌</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortableHeader field="current_stage">当前阶段</SortableHeader>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                进度
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortableHeader field="created_at">创建时间</SortableHeader>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedCustomers.map((customer) => {
              const stageIndex = getStageIndex(customer.current_stage);

              return (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-medium">
                          {customer.name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{customer.name}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {customer.phone || '无电话'}
                          {customer.area && ` · ${customer.area}`}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {customer.capacity && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {customer.capacity}
                            </span>
                          )}
                          {customer.panel_count && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 ml-1">
                              {customer.panel_count}块
                            </span>
                          )}
                          {customer.customer_type === 'dealer' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-700 ml-1">
                              二级商
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      {customer.salesperson ? (
                        <div className="text-gray-900">{customer.salesperson.name}</div>
                      ) : (
                        <span className="text-gray-400">未分配</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {customer.brand || <span className="text-gray-400">未设置</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.current_stage === 'close'
                          ? 'bg-green-100 text-green-800'
                          : customer.current_stage === 'grid'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {STAGE_LABELS[customer.current_stage]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-32">
                      <div className="flex items-center gap-1">
                        {STAGE_ORDER.map((stage, idx) => (
                          <div
                            key={stage}
                            className={`h-2 flex-1 rounded-full ${
                              idx <= stageIndex
                                ? stage === 'close'
                                  ? 'bg-green-500'
                                  : 'bg-primary'
                                : 'bg-gray-200'
                            }`}
                            title={STAGE_LABELS[stage]}
                          />
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stageIndex + 1}/{STAGE_ORDER.length}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {new Date(customer.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm text-primary hover:text-primary-hover hover:bg-gray-100 rounded-md transition-colors duration-150"
                    >
                      查看详情
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
