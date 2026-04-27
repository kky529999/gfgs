import { getAuthCookie } from '@/lib/auth/cookie';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

async function getDashboardData() {
  const auth = await getAuthCookie();
  if (!auth) return null;

  // 根据角色设置查询条件
  let customerQuery = supabase.from('customers').select('*', { count: 'exact', head: true });

  switch (auth.role) {
    case 'business':
      customerQuery = customerQuery.eq('salesperson_id', auth.user_id);
      break;
    case 'tech':
      customerQuery = customerQuery.eq('tech_assigned_id', auth.user_id);
      break;
    // admin 和 gm 可以看到全部
  }

  const { count: totalCustomers } = await customerQuery;

  // 在途客户（未闭环）
  const { count: inProgress } = await customerQuery
    .neq('current_stage', 'close');

  // 本月并网
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const { count: gridThisMonth } = await customerQuery
    .gte('grid_date', startOfMonth)
    .not('grid_date', 'is', null);

  // 本月闭环
  const { count: closeThisMonth } = await customerQuery
    .gte('close_date', startOfMonth)
    .not('close_date', 'is', null);

  // 阶段统计（应用角色过滤）
  let stageQuery = supabase.from('customers').select('current_stage');

  switch (auth.role) {
    case 'business':
      stageQuery = stageQuery.eq('salesperson_id', auth.user_id);
      break;
    case 'tech':
      stageQuery = stageQuery.eq('tech_assigned_id', auth.user_id);
      break;
    // admin 和 gm 可以看到全部
  }

  const { data: stageData } = await stageQuery;

  const stageCounts: Record<string, number> = {};
  stageData?.forEach((c) => {
    stageCounts[c.current_stage] = (stageCounts[c.current_stage] || 0) + 1;
  });

  return {
    totalCustomers: totalCustomers || 0,
    inProgress: inProgress || 0,
    gridThisMonth: gridThisMonth || 0,
    closeThisMonth: closeThisMonth || 0,
    stageCounts,
  };
}

async function getRecentCustomers() {
  const auth = await getAuthCookie();
  if (!auth) return [];

  let query = supabase
    .from('customers')
    .select(`
      id,
      name,
      phone,
      current_stage,
      created_at,
      salesperson:employees!salesperson_id(name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  // 角色过滤
  if (auth.role === 'business') {
    query = query.eq('salesperson_id', auth.user_id);
  } else if (auth.role === 'tech') {
    query = query.eq('tech_assigned_id', auth.user_id);
  }

  const { data } = await query;
  return data || [];
}

export default async function DashboardPage() {
  const auth = await getAuthCookie();
  if (!auth) {
    return <div>未登录</div>;
  }

  const data = await getDashboardData();
  const recentCustomers = await getRecentCustomers();

  const roleLabels: Record<string, string> = {
    admin: '综合管理部',
    business: '业务开发部',
    tech: '技术方案部',
    gm: '总经理',
  };

  const stageLabels: Record<string, string> = {
    survey: '现勘',
    design: '设计出图',
    filing: '建档通过',
    record: '备案',
    grid_materials: '并网资料',
    ship: '发货',
    grid: '并网',
    close: '闭环',
  };

  const stages = ['survey', 'design', 'filing', 'record', 'grid_materials', 'ship', 'grid', 'close'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            工作台
          </h1>
          <p className="text-gray-500 mt-1">
            {roleLabels[auth.role]} · {auth.phone}
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500">总客户数</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            {data?.totalCustomers || 0}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500">在途客户</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {data?.inProgress || 0}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500">本月并网</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {data?.gridThisMonth || 0}
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="text-sm text-gray-500">本月闭环</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">
            {data?.closeThisMonth || 0}
          </div>
        </div>
      </div>

      {/* Stage Funnel */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">8阶段进度</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {stages.map((stage) => (
            <div key={stage} className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data?.stageCounts[stage] || 0}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {stageLabels[stage]}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
            {stages.map((stage) => {
              const count = data?.stageCounts[stage] || 0;
              const total = data?.totalCustomers || 1;
              const width = (count / total) * 100;
              return (
                <div
                  key={stage}
                  className="bg-indigo-500 h-full"
                  style={{ width: `${width}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            {stages.map((stage) => (
              <span key={stage}>{stageLabels[stage]}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a
            href="/customers/new"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium">新建客户</span>
          </a>
          <a
            href="/customers"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">客户列表</span>
          </a>
          <a
            href="/commissions"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">提成管理</span>
          </a>
          <a
            href="/growth-fund"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-sm font-medium">成长基金</span>
          </a>
        </div>
      </div>

      {/* Recent Customers */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最近客户</h2>
          <Link href="/customers" className="text-sm text-indigo-600 hover:text-indigo-800">
            查看全部
          </Link>
        </div>
        {recentCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无客户数据
          </div>
        ) : (
          <div className="space-y-3">
            {recentCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/customers/${customer.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-medium">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-500">
                      {customer.phone || '无电话'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.current_stage === 'close'
                      ? 'bg-green-100 text-green-800'
                      : customer.current_stage === 'grid'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {stageLabels[customer.current_stage]}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(customer.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
