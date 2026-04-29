import { getAuthCookie } from '@/lib/auth/cookie';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import StageHover from './_components/StageHover';

interface OverdueWarning {
  id: string;
  name: string;
  phone: string;
  brand: string;
  stage: string;
  deadline: string;
  daysRemaining: number;
  shipDate: string;
}

interface AdminMetrics {
  filingOverdue: Array<{ id: string; name: string; phone: string; surveyDate: string; daysSinceSurvey: number }>;
  gridOverdue: Array<{ id: string; name: string; phone: string; brand: string; daysSinceShip: number }>;
  closePending: Array<{ id: string; name: string; phone: string; gridDate: string }>;
}

interface StageCustomer {
  id: string;
  name: string;
  phone: string;
  startDate: string;
  daysElapsed: number;
  isTotalFlow?: boolean;
}

interface BusinessMetrics {
  myCustomers: Array<{ id: string; name: string; phone: string; current_stage: string; created_at: string }>;
  notShipped: number;
  pendingEvidence: Array<{ id: string; name: string; current_stage: string }>;
}

interface TechMetrics {
  mySurveyTasks: Array<{ id: string; name: string; phone: string; address: string }>;
  pendingDesigns: Array<{ id: string; name: string; surveyDate: string; daysSinceSurvey: number }>;
  gridCountdown: Array<{ id: string; name: string; brand: string; deadline: string; daysRemaining: number }>;
  warehouseAlerts: Array<{ name: string; quantity: number; minQuantity: number }>;
}

async function getOverdueWarnings(): Promise<OverdueWarning[]> {
  // Get customers who have shipped but not yet grid-connected
  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, brand, current_stage, ship_date, grid_date')
    .eq('current_stage', 'ship')
    .not('ship_date', 'is', null)
    .not('grid_date', 'is', null);

  if (!customers) return [];

  const warnings: OverdueWarning[] = [];
  const today = new Date();

  for (const customer of customers) {
    const shipDate = new Date(customer.ship_date);
    const daysSinceShip = Math.floor((today.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
    const deadlineDays = customer.brand?.toLowerCase().includes('天合') ? 43 : 28;
    const deadline = new Date(shipDate);
    deadline.setDate(deadline.getDate() + deadlineDays);
    const daysRemaining = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 7 && daysRemaining >= 0) {
      warnings.push({
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        brand: customer.brand || '',
        stage: '并网',
        deadline: deadline.toISOString().split('T')[0],
        daysRemaining,
        shipDate: customer.ship_date,
      });
    }
  }

  return warnings.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

async function getAdminMetrics(): Promise<AdminMetrics | null> {
  const auth = await getAuthCookie();
  if (auth?.role !== 'admin' && auth?.role !== 'gm') return null;

  const today = new Date();

  // Filing overdue: customers who passed survey stage but haven't filed within 7 workdays
  const { data: filingData } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, survey_date, filing_date')
    .eq('current_stage', 'survey');

  const filingOverdue: AdminMetrics['filingOverdue'] = [];
  if (filingData) {
    for (const c of filingData) {
      if (c.survey_date && !c.filing_date) {
        const surveyDate = new Date(c.survey_date);
        const daysSinceSurvey = Math.floor((today.getTime() - surveyDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceSurvey > 7) {
          filingOverdue.push({ id: c.id, name: c.name, phone: c.phone || '', surveyDate: c.survey_date, daysSinceSurvey });
        }
      }
    }
  }

  // Grid overdue: customers who shipped but haven't connected to grid within deadline
  const { data: gridData } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, brand, ship_date, grid_date')
    .eq('current_stage', 'ship')
    .not('ship_date', 'is', null);

  const gridOverdue: AdminMetrics['gridOverdue'] = [];
  if (gridData) {
    for (const c of gridData) {
      if (c.ship_date && !c.grid_date) {
        const shipDate = new Date(c.ship_date);
        const daysSinceShip = Math.floor((today.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
        const deadlineDays = c.brand?.toLowerCase().includes('天合') ? 45 : 30;
        if (daysSinceShip > deadlineDays) {
          gridOverdue.push({ id: c.id, name: c.name, phone: c.phone || '', brand: c.brand || '', daysSinceShip });
        }
      }
    }
  }

  // Close pending: customers who have grid date but not close date
  const { data: closeData } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, grid_date')
    .eq('current_stage', 'grid');

  const closePending: AdminMetrics['closePending'] = [];
  if (closeData) {
    for (const c of closeData) {
      if (c.grid_date) {
        closePending.push({ id: c.id, name: c.name, phone: c.phone || '', gridDate: c.grid_date });
      }
    }
  }

  return { filingOverdue, gridOverdue, closePending };
}

async function getBusinessMetrics(): Promise<BusinessMetrics | null> {
  const auth = await getAuthCookie();
  if (auth?.role !== 'business') return null;

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 7);

  // My customers
  const { data: myCustomers } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, current_stage, created_at')
    .eq('salesperson_id', auth.user_id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Not shipped (past ship stage)
  const { count: notShippedCount } = await supabaseAdmin
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('salesperson_id', auth.user_id)
    .in('current_stage', ['survey', 'design', 'filing', 'record', 'grid_materials']);

  // Pending evidence uploads
  const { data: pendingEvidenceData } = await supabaseAdmin
    .from('customers')
    .select('id, name, current_stage')
    .eq('salesperson_id', auth.user_id)
    .in('current_stage', ['grid']);

  return {
    myCustomers: myCustomers || [],
    notShipped: notShippedCount || 0,
    pendingEvidence: pendingEvidenceData || [],
  };
}

async function getTechMetrics(): Promise<TechMetrics | null> {
  const auth = await getAuthCookie();
  if (auth?.role !== 'tech') return null;

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - 7);

  // My survey tasks (customers assigned to me at survey stage)
  const { data: surveyTasks } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, address')
    .eq('tech_assigned_id', auth.user_id)
    .eq('current_stage', 'survey')
    .order('created_at', { ascending: false });

  // Pending designs (design stage, more than 2 days since survey)
  const { data: pendingDesignsData } = await supabaseAdmin
    .from('customers')
    .select('id, name, survey_date')
    .eq('tech_assigned_id', auth.user_id)
    .eq('current_stage', 'design');

  const pendingDesigns: TechMetrics['pendingDesigns'] = [];
  if (pendingDesignsData) {
    for (const c of pendingDesignsData) {
      if (c.survey_date) {
        const surveyDate = new Date(c.survey_date);
        const daysSinceSurvey = Math.floor((today.getTime() - surveyDate.getTime()) / (1000 * 60 * 60 * 24));
        pendingDesigns.push({ id: c.id, name: c.name, surveyDate: c.survey_date, daysSinceSurvey });
      }
    }
  }

  // Grid countdown (shipped but not grid)
  const { data: gridCountdownData } = await supabaseAdmin
    .from('customers')
    .select('id, name, brand, ship_date')
    .eq('tech_assigned_id', auth.user_id)
    .eq('current_stage', 'ship')
    .not('ship_date', 'is', null);

  const gridCountdown: TechMetrics['gridCountdown'] = [];
  if (gridCountdownData) {
    for (const c of gridCountdownData) {
      if (c.ship_date) {
        const shipDate = new Date(c.ship_date);
        const daysSinceShip = Math.floor((today.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
        const deadlineDays = c.brand?.toLowerCase().includes('天合') ? 43 : 28;
        const daysRemaining = deadlineDays - daysSinceShip;
        const deadline = new Date(shipDate);
        deadline.setDate(deadline.getDate() + deadlineDays);
        gridCountdown.push({
          id: c.id,
          name: c.name,
          brand: c.brand || '',
          deadline: deadline.toISOString().split('T')[0],
          daysRemaining,
        });
      }
    }
  }

  // Warehouse alerts (items below min quantity)
  const { data: warehouseAlerts } = await supabaseAdmin
    .from('warehouse_materials')
    .select('brand, quantity')
    .not('note', 'ilike', '%min:%');

  const alerts: TechMetrics['warehouseAlerts'] = [];
  if (warehouseAlerts) {
    // Simple alert: quantity < 10
    for (const item of warehouseAlerts) {
      if (item.quantity < 10) {
        alerts.push({ name: item.brand, quantity: item.quantity, minQuantity: 10 });
      }
    }
  }

  return {
    mySurveyTasks: surveyTasks || [],
    pendingDesigns,
    gridCountdown,
    warehouseAlerts: alerts,
  };
}

async function getDashboardData() {
  const auth = await getAuthCookie();
  if (!auth) return null;

  const today = new Date();

  // 根据角色设置查询条件 - 获取完整数据用于去重统计
  let baseQuery = supabaseAdmin.from('customers').select('name, current_stage, grid_date, close_date');

  switch (auth.role) {
    case 'business':
      baseQuery = baseQuery.eq('salesperson_id', auth.user_id);
      break;
    case 'tech':
      baseQuery = baseQuery.eq('tech_assigned_id', auth.user_id);
      break;
    // admin 和 gm 可以看到全部
  }

  const { data: allCustomers } = await baseQuery;

  // 按名字去重统计
  const uniqueNames = new Set<string>();
  const uniqueInProgressNames = new Set<string>();
  const uniqueGridThisMonthNames = new Set<string>();
  const uniqueCloseThisMonthNames = new Set<string>();

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

  allCustomers?.forEach((c) => {
    if (c.name) {
      uniqueNames.add(c.name);

      // 在途客户（未闭环）
      if (c.current_stage !== 'close') {
        uniqueInProgressNames.add(c.name);
      }

      // 本月并网（按名字去重）
      if (c.grid_date && c.grid_date >= startOfMonth) {
        uniqueGridThisMonthNames.add(c.name);
      }

      // 本月闭环（按名字去重）
      if (c.close_date && c.close_date >= startOfMonth) {
        uniqueCloseThisMonthNames.add(c.name);
      }
    }
  });

  const totalCustomers = uniqueNames.size;
  const inProgress = uniqueInProgressNames.size;
  const gridThisMonth = uniqueGridThisMonthNames.size;
  const closeThisMonth = uniqueCloseThisMonthNames.size;

  // 阶段统计：直接按 current_stage 统计，不重复（每个客户只属于一个阶段）
  const stageCounts: Record<string, number> = {};
  const stages = ['survey', 'design', 'filing', 'record', 'grid_materials', 'ship', 'grid', 'close'];
  for (const stage of stages) {
    stageCounts[stage] = 0;
  }

  // 获取每个阶段的客户详情（用于悬停显示）
  // 注意：只取 current_stage === stage 的客户，避免重复
  let stageCustomersQuery = supabaseAdmin
    .from('customers')
    .select('id, name, phone, current_stage, survey_date, design_date, filing_date, record_date, grid_materials_date, ship_date, grid_date, close_date');

  switch (auth.role) {
    case 'business':
      stageCustomersQuery = stageCustomersQuery.eq('salesperson_id', auth.user_id);
      break;
    case 'tech':
      stageCustomersQuery = stageCustomersQuery.eq('tech_assigned_id', auth.user_id);
      break;
  }

  // 加上 current_stage 过滤，只取当前阶段的客户
  const { data: stageCustomersData } = await stageCustomersQuery
    .in('current_stage', stages);

  // 按阶段分组客户
  const stageCustomers: Record<string, StageCustomer[]> = {};
  for (const stage of stages) {
    stageCustomers[stage] = [];
  }

  stageCustomersData?.forEach((c) => {
    const stage = c.current_stage;
    if (!stage || !stages.includes(stage)) return;

    // 按名字去重统计该阶段客户数
    if (c.name) {
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    }

    // 闭环客户：显示从现勘到闭环的总天数
    if (stage === 'close' && c.survey_date && c.close_date) {
      const surveyDate = new Date(c.survey_date);
      const closeDate = new Date(c.close_date);
      const totalDays = Math.floor((closeDate.getTime() - surveyDate.getTime()) / (1000 * 60 * 60 * 24));
      stageCustomers[stage].push({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        startDate: c.survey_date,
        daysElapsed: totalDays,
        isTotalFlow: true,
      });
      return;
    }

    // 非闭环客户：显示从该阶段开始的天数
    const stageDateField = getStageDateField(stage);
    const stageDate = c[stageDateField as keyof typeof c] as string | null;
    if (!stageDate) return;

    const startDate = new Date(stageDate);
    const daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    stageCustomers[stage].push({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      startDate: stageDate,
      daysElapsed,
      isTotalFlow: false,
    });
  });

  // 再次按名字去重 stageCounts（处理同名客户重复统计）
  const stageNameSets: Record<string, Set<string>> = {};
  for (const stage of stages) {
    stageNameSets[stage] = new Set();
  }
  stageCustomersData?.forEach((c) => {
    const stage = c.current_stage;
    if (stage && stages.includes(stage) && c.name) {
      stageNameSets[stage].add(c.name);
    }
  });
  for (const stage of stages) {
    stageCounts[stage] = stageNameSets[stage].size;
  }

  return {
    totalCustomers: totalCustomers || 0,
    inProgress: inProgress || 0,
    gridThisMonth: gridThisMonth || 0,
    closeThisMonth: closeThisMonth || 0,
    stageCounts,
    stageCustomers,
  };
}

// 获取阶段对应的日期字段
function getStageDateField(stage: string): string {
  const dateFields: Record<string, string> = {
    survey: 'survey_date',
    design: 'design_date',
    filing: 'filing_date',
    record: 'record_date',
    grid_materials: 'grid_materials_date',
    ship: 'ship_date',
    grid: 'grid_date',
    close: 'close_date',
  };
  return dateFields[stage] || 'created_at';
}

async function getRecentCustomers() {
  const auth = await getAuthCookie();
  if (!auth) return [];

  let query = supabaseAdmin
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
  const overdueWarnings = await getOverdueWarnings();
  const adminMetrics = await getAdminMetrics();
  const businessMetrics = await getBusinessMetrics();
  const techMetrics = await getTechMetrics();

  const currentMonth = new Date().getMonth() + 1;

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          工作台
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {roleLabels[auth.role]} · {auth.phone}
        </p>
      </div>

      {/* Overdue Warning Banner */}
      {overdueWarnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-semibold text-red-800">逾期预警（{overdueWarnings.length}条）</h3>
          </div>
          <div className="space-y-2">
            {overdueWarnings.slice(0, 5).map((warning) => (
              <Link
                key={warning.id}
                href={`/customers/${warning.id}`}
                className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-red-100 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-900">{warning.name}</span>
                  <span className="text-gray-500 ml-2">{warning.phone}</span>
                  <span className="text-gray-500 ml-2">{warning.brand}</span>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${warning.daysRemaining <= 3 ? 'text-red-600' : 'text-orange-600'}`}>
                    剩余 {warning.daysRemaining} 天
                  </span>
                  <span className="text-gray-400 ml-2 text-sm">截止 {warning.deadline}</span>
                </div>
              </Link>
            ))}
          </div>
          {overdueWarnings.length > 5 && (
            <Link href="/customers?filter=overdue" className="text-sm text-red-600 hover:underline mt-2 inline-block">
              查看全部 {overdueWarnings.length} 条预警
            </Link>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-subtle">
          <p className="text-xs text-gray-500 uppercase tracking-wide">总客户数</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1.5 tracking-tight">
            {data?.totalCustomers || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-subtle">
          <p className="text-xs text-gray-500 uppercase tracking-wide">进行中客户</p>
          <p className="text-3xl font-semibold text-blue-600 mt-1.5 tracking-tight">
            {data?.inProgress || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-subtle">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{currentMonth}月并网</p>
          <p className="text-3xl font-semibold text-green-600 mt-1.5 tracking-tight">
            {data?.gridThisMonth || 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-subtle">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{currentMonth}月闭环</p>
          <p className="text-3xl font-semibold text-purple-600 mt-1.5 tracking-tight">
            {data?.closeThisMonth || 0}
          </p>
        </div>
      </div>

      {/* Stage Funnel */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">8阶段进度</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {stages.map((stage) => (
            <StageHover
              key={stage}
              stage={stage}
              stageLabel={stageLabels[stage]}
              count={data?.stageCounts[stage] || 0}
              customers={data?.stageCustomers[stage] || []}
            />
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

      {/* Admin Department View */}
      {(auth.role === 'admin' || auth.role === 'gm') && adminMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Filing Overdue */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">备案超时</h3>
              {adminMetrics.filingOverdue.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {adminMetrics.filingOverdue.length}
                </span>
              )}
            </div>
            {adminMetrics.filingOverdue.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无超时客户</p>
            ) : (
              <div className="space-y-2">
                {adminMetrics.filingOverdue.slice(0, 3).map((item) => {
                  const surveyDateParts = item.surveyDate.split('-');
                  const surveyDateFormatted = `${parseInt(surveyDateParts[1])}月${parseInt(surveyDateParts[2])}日开始，已过${item.daysSinceSurvey}天`;
                  return (
                    <Link
                      key={item.id}
                      href={`/customers/${item.id}`}
                      className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">{surveyDateFormatted}</div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grid Overdue */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">并网超时</h3>
              {adminMetrics.gridOverdue.length > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {adminMetrics.gridOverdue.length}
                </span>
              )}
            </div>
            {adminMetrics.gridOverdue.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无超时客户</p>
            ) : (
              <div className="space-y-2">
                {adminMetrics.gridOverdue.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/customers/${item.id}`}
                    className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.brand} · 已过 {item.daysSinceShip} 天</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Close Pending */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">闭环待确认</h3>
              {adminMetrics.closePending.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {adminMetrics.closePending.length}
                </span>
              )}
            </div>
            {adminMetrics.closePending.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无待闭环客户</p>
            ) : (
              <div className="space-y-2">
                {adminMetrics.closePending.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/customers/${item.id}`}
                    className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">并网日期 {item.gridDate}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Department View */}
      {auth.role === 'business' && businessMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* My Customers */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">我的客户</h3>
              <span className="text-sm text-gray-500">{businessMetrics.myCustomers.length} 户</span>
            </div>
            {businessMetrics.myCustomers.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无客户</p>
            ) : (
              <div className="space-y-2">
                {businessMetrics.myCustomers.slice(0, 5).map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/customers/${customer.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {customer.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.phone || '无电话'}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      customer.current_stage === 'close'
                        ? 'bg-green-100 text-green-800'
                        : customer.current_stage === 'grid'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {stageLabels[customer.current_stage]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pending Evidence */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">待上传凭证</h3>
              {businessMetrics.pendingEvidence.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {businessMetrics.pendingEvidence.length}
                </span>
              )}
            </div>
            {businessMetrics.pendingEvidence.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无待上传凭证</p>
            ) : (
              <div className="space-y-2">
                {businessMetrics.pendingEvidence.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/customers/${item.id}`}
                    className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-orange-600">并网完成，等待上传闭环视频</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tech Department View */}
      {auth.role === 'tech' && techMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* My Survey Tasks */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">现勘任务</h3>
              {techMetrics.mySurveyTasks.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {techMetrics.mySurveyTasks.length}
                </span>
              )}
            </div>
            {techMetrics.mySurveyTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无现勘任务</p>
            ) : (
              <div className="space-y-2">
                {techMetrics.mySurveyTasks.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    href={`/customers/${task.id}`}
                    className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{task.name}</div>
                    <div className="text-xs text-gray-500">{task.address || task.phone || '无地址'}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pending Designs */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">出图待完成</h3>
              {techMetrics.pendingDesigns.length > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {techMetrics.pendingDesigns.length}
                </span>
              )}
            </div>
            {techMetrics.pendingDesigns.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无待出图客户</p>
            ) : (
              <div className="space-y-2">
                {techMetrics.pendingDesigns.map((item) => (
                  <Link
                    key={item.id}
                    href={`/customers/${item.id}`}
                    className="block p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">现勘 {item.surveyDate}</div>
                    {item.daysSinceSurvey > 2 && (
                      <span className="text-xs text-red-600">已超时 {item.daysSinceSurvey - 2} 天</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Grid Countdown */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">并网倒计时</h3>
              {techMetrics.gridCountdown.length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {techMetrics.gridCountdown.length}
                </span>
              )}
            </div>
            {techMetrics.gridCountdown.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无并网倒计时</p>
            ) : (
              <div className="space-y-2">
                {techMetrics.gridCountdown.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/customers/${item.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className={`text-sm font-medium ${
                      item.daysRemaining <= 7 ? 'text-red-600' : item.daysRemaining <= 14 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {item.daysRemaining > 0 ? `${item.daysRemaining} 天` : '已超时'}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Warehouse Alerts */}
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">库存预警</h3>
              {techMetrics.warehouseAlerts.length > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {techMetrics.warehouseAlerts.length}
                </span>
              )}
            </div>
            {techMetrics.warehouseAlerts.length === 0 ? (
              <p className="text-gray-500 text-sm">库存充足</p>
            ) : (
              <div className="space-y-2">
                {techMetrics.warehouseAlerts.map((item, idx) => (
                  <Link
                    key={idx}
                    href="/warehouse"
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                    <div className="text-sm text-red-600 font-medium">仅剩 {item.quantity}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/customers/new"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all duration-150 btn-press"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium">新建客户</span>
          </Link>
          <Link
            href="/customers"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150 btn-press"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">客户列表</span>
          </Link>
          <Link
            href="/commissions"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150 btn-press"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">提成管理</span>
          </Link>
          <Link
            href="/growth-fund"
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-150 btn-press"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-sm font-medium">成长基金</span>
          </Link>
        </div>
      </div>

      {/* Recent Customers */}
      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最近客户</h2>
          <Link href="/customers" className="text-sm text-primary hover:underline transition-colors duration-150">
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
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
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
