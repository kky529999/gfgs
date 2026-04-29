'use client';

import { useState } from 'react';
import Link from 'next/link';

interface StageCustomer {
  id: string;
  name: string;
  phone: string;
  startDate: string;
  daysElapsed: number;
  isTotalFlow?: boolean;
}

interface StageHoverProps {
  stage: string;
  stageLabel: string;
  count: number;
  customers: StageCustomer[];
}

export default function StageHover({ stage, stageLabel, count, customers }: StageHoverProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
  };

  return (
    <div
      className="text-center relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
        {count}
      </div>
      <div className="text-sm text-gray-500 mt-1">
        {stageLabel}
      </div>

      {/* Tooltip */}
      {showTooltip && customers.length > 0 && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-left">
          <div className="text-xs font-medium text-gray-500 mb-2 border-b pb-1">
            {stageLabel}阶段客户
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="block p-1.5 rounded hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900 text-sm truncate">
                  {customer.name}
                </div>
                <div className="text-xs text-gray-500">
                  {customer.isTotalFlow
                    ? `${formatDate(customer.startDate)} 闭环 · 共用了${customer.daysElapsed}天`
                    : `${formatDate(customer.startDate)} 开始 · 已过${customer.daysElapsed}天`
                  }
                </div>
              </Link>
            ))}
          </div>
          {customers.length > 8 && (
            <div className="text-xs text-gray-400 mt-2 text-center">
              还有 {customers.length - 8} 个客户...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
