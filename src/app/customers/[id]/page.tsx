'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { enrichCustomer } from '@/lib/deadlines';
import type { CustomerWithDeadline, StageHistory, StageDefinition } from '@/types';
import StageTag from '@/components/StageTag';
import DeadlineBadge from '@/components/DeadlineBadge';
import StageTimeline from '@/components/StageTimeline';
import StageUpdateModal from '@/components/StageUpdateModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerWithDeadline | null>(null);
  const [history, setHistory] = useState<StageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

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
          .eq('id', id)
          .single();

        if (err) throw err;

        const { data: histData } = await supabase
          .from('stage_history')
          .select('*')
          .eq('customer_id', id)
          .order('entered_at', { ascending: false });

        setCustomer(enrichCustomer(data as any, defs));
        setHistory(histData ?? []);
      } catch (e: any) {
        setError(e.message ?? '加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleUpdateStage(stageKey: string, notes: string) {
    if (!customer) return;

    const { error: err } = await supabase
      .from('stage_history')
      .insert({
        customer_id: customer.id,
        stage_key: stageKey,
        stage_name: '',
        entered_at: new Date().toISOString(),
        notes,
      });

    if (err) throw err;

    const { error: updateErr } = await supabase
      .from('customers')
      .update({ current_stage: stageKey, updated_at: new Date().toISOString() })
      .eq('id', customer.id);

    if (updateErr) throw updateErr;

    setCustomer({ ...customer, current_stage: stageKey as any });
    const { data: histData } = await supabase
      .from('stage_history')
      .select('*')
      .eq('customer_id', customer.id)
      .order('entered_at', { ascending: false });
    setHistory(histData ?? []);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-sm">{error ?? '客户未找到'}</p>
        <Link href="/customers" className="mt-3 text-sm text-blue-600 hover:underline">
          返回客户列表
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
            <p className="text-sm text-gray-500">
              {customer.serial_number ? `序号 ${customer.serial_number}` : ''}
              {customer.region ? ` · ${customer.region}` : ''}
              {customer.brand ? ` · ${customer.brand}` : ''}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            更新阶段
          </button>
        </div>
      </header>

      <main className="flex-1 bg-gray-50 p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border bg-white p-6">
              <h2 className="mb-4 text-sm font-medium text-gray-500">当前阶段</h2>
              <div className="flex items-start justify-between">
                <div>
                  <StageTag stage={customer.current_stage} />
                  <p className="mt-2 text-sm text-gray-600">
                    {customer.salesperson ? `业务员: ${customer.salesperson.name}` : '未分配业务员'}
                  </p>
                </div>
                <DeadlineBadge
                  remainingDays={customer.remaining_days}
                  deadline={customer.deadline}
                  status={customer.status}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6">
              <h2 className="mb-4 text-sm font-medium text-gray-500">基本信息</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-400">项目公司</dt>
                  <dd className="mt-0.5 text-gray-900">{customer.project_company ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">房型</dt>
                  <dd className="mt-0.5 text-gray-900">{customer.house_type ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">组件数量</dt>
                  <dd className="mt-0.5 text-gray-900">{customer.panel_count ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">业务费状态</dt>
                  <dd className="mt-0.5 text-gray-900">{customer.business_fee_status ?? '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border bg-white p-6">
              <h2 className="mb-4 text-sm font-medium text-gray-500">阶段时间线</h2>
              <StageTimeline history={history} currentStage={customer.current_stage} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-white p-6">
              <h2 className="mb-4 text-sm font-medium text-gray-500">各阶段日期</h2>
              <dl className="space-y-2 text-sm">
                {[
                  { label: '签合同', date: customer.contract_date },
                  { label: '现勘', date: customer.survey_date },
                  { label: '设计', date: customer.design_date },
                  { label: '建档', date: customer.record_approved_date },
                  { label: '备案', date: customer.filing_date },
                  { label: '并网资料', date: customer.grid_docs_date },
                  { label: '发货', date: customer.shipping_date },
                  { label: '并网', date: customer.grid_date },
                  { label: '闭环', date: customer.closed_date },
                  { label: '验收', date: customer.acceptance_date },
                ].map(({ label, date }) => (
                  <div key={label} className="flex items-center justify-between">
                    <dt className="text-gray-400">{label}</dt>
                    <dd className="text-gray-900">{date ?? '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <StageUpdateModal
          currentStage={customer.current_stage}
          customerName={customer.name}
          onClose={() => setShowModal(false)}
          onSubmit={handleUpdateStage}
        />
      )}
    </div>
  );
}