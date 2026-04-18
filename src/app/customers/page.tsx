'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadStageDefinitions } from '@/lib/deadlines';
import { enrichCustomer } from '@/lib/deadlines';
import type { CustomerWithDeadline, StageDefinition } from '@/types';
import CustomerTable from '@/components/CustomerTable';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data: defData } = await supabase
          .from('stage_definitions')
          .select('*')
          .order('sequence');

        const defs: StageDefinition[] = defData ?? [];

        const { data, error: err } = await supabase
          .from('customers')
          .select('*, salesperson:employees(*)')
          .order('serial_number', { ascending: true });

        if (err) throw err;

        const enriched = (data ?? []).map(c => enrichCustomer(c as any, defs));
        setCustomers(enriched);
      } catch (e: any) {
        setError(e.message ?? '加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">客户进度</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              共 {customers.length} 个客户
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-gray-50 p-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">加载失败：{error}</p>
            <p className="text-xs text-red-500 mt-1">请确认 Supabase 数据库已创建并运行了 SQL Schema</p>
          </div>
        ) : (
          <CustomerTable customers={customers} loading={loading} />
        )}
      </main>
    </div>
  );
}