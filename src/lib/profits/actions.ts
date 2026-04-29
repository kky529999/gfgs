'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { Customer, BrandPolicy, BrandPolicySnapshot } from '@/types';
import type { ProfitCalculation } from '@/types';

// Grid deadline in days by brand
const GRID_DEADLINE_DAYS: Record<string, number> = {
  '天合': 43,
  '天合光能': 43,
  // Add more brand-specific deadlines as needed
};

// Default deadline for brands not in the map
const DEFAULT_GRID_DEADLINE_DAYS = 28;

// Parse grid penalty from policy string (e.g., "100元/天" -> 100)
function parseGridPenaltyPerDay(penaltyStr: string | null | undefined): number {
  if (!penaltyStr) return 200; // Default 200元/天
  const match = penaltyStr.match(/(\d+)(?:元\/天|元\/天逾期)?/);
  return match ? parseInt(match[1], 10) : 200;
}

// Calculate grid penalty based on actual dates
function calculateGridPenalty(
  shipDate: string | null | undefined,
  gridDate: string | null | undefined,
  brand: string | null | undefined,
  gridPenaltyStr: string | null | undefined
): number {
  if (!shipDate || !gridDate) return 0;

  const ship = new Date(shipDate);
  const grid = new Date(gridDate);

  // If grid_date is before ship_date, no penalty
  if (grid <= ship) return 0;

  // Calculate overdue days
  const diffTime = grid.getTime() - ship.getTime();
  const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Get deadline for this brand
  const brandName = brand || '';
  const deadline = GRID_DEADLINE_DAYS[brandName] || DEFAULT_GRID_DEADLINE_DAYS;

  // If within deadline, no penalty
  if (overdueDays <= deadline) return 0;

  // Calculate penalty for overdue days
  const penaltyPerDay = parseGridPenaltyPerDay(gridPenaltyStr);
  const penaltyDays = overdueDays - deadline;
  return penaltyDays * penaltyPerDay;
}

// Helper to check admin/gm permission
async function checkAdminPermission(): Promise<{ allowed: boolean; error?: string }> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { allowed: false, error: '未登录' };
  }
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { allowed: false, error: '无权访问' };
  }
  await refreshSessionAction();
  return { allowed: true };
}

// Get customers with profit calculation data
export async function getProfitCalculationsAction(filters?: {
  brand?: string;
  customer_type?: string;
}): Promise<{
  success: boolean;
  data?: ProfitCalculation[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    // Get all customers with their salesperson and brand policy snapshot
    let query = supabaseAdmin
      .from('customers')
      .select(`
        id,
        name,
        phone,
        brand,
        capacity,
        panel_count,
        customer_type,
        dealer_id,
        salesperson:employees!salesperson_id(name),
        policy_snapshot,
        current_stage,
        close_date,
        ship_date,
        grid_date,
        construction_labor,
        construction_material,
        construction_other
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.brand) {
      query = query.eq('brand', filters.brand);
    }
    if (filters?.customer_type) {
      query = query.eq('customer_type', filters.customer_type);
    }

    const { data: customers, error: customersError } = await query;

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      return { success: false, error: '获取客户列表失败' };
    }

    if (!customers || customers.length === 0) {
      return { success: true, data: [] };
    }

    // Get active brand policies for reference (fallback if no snapshot)
    const { data: policies } = await supabaseAdmin
      .from('brand_policies')
      .select('*')
      .eq('is_active', true);

    const policyMap = new Map<string, BrandPolicy>();
    policies?.forEach((p) => policyMap.set(p.brand, p));

    // Get dealer info for fee calculation
    const { data: dealers } = await supabaseAdmin
      .from('dealers')
      .select('id, fee_per_panel');

    const dealerFeeMap = new Map<string, number>();
    dealers?.forEach((d) => {
      if (d.fee_per_panel) {
        dealerFeeMap.set(d.id, d.fee_per_panel);
      }
    });

    // Calculate profits for each customer
    const profitCalculations: ProfitCalculation[] = customers.map((customer) => {
      // Prefer policy_snapshot, fallback to active policy
      const policySnapshot = customer.policy_snapshot as BrandPolicySnapshot | null;
      const activePolicy = policyMap.get(customer.brand || '');
      const policy = policySnapshot || activePolicy;

      const panelCount = customer.panel_count || 0;

      // Revenue formula:
      // 品牌收入 = (安装服务费 + 综合补贴 + 渠道提点) × 板数 + 验仓奖励
      const installationFee = policy?.installation_fee || 0;
      const comprehensiveSubsidy = policy?.comprehensive_subsidy || 0;
      const channelFee = policy?.channel_fee || 0;
      const inspectionReward = policy?.inspection_reward || 0;

      const brandRevenue =
        (installationFee + comprehensiveSubsidy + channelFee) * panelCount +
        inspectionReward;

      // Cost calculation
      const laborCost = customer.construction_labor || 0;
      const materialCost = customer.construction_material || 0;
      const otherCost = customer.construction_other || 0;
      const totalCost = laborCost + materialCost + otherCost;

      // Dealer fee (only for dealer-type customers)
      let dealerFee = 0;
      if (customer.customer_type === 'dealer' && customer.dealer_id) {
        const feePerPanel = dealerFeeMap.get(customer.dealer_id) || 0;
        dealerFee = feePerPanel * panelCount;
      }

      // Grid penalty based on actual dates (天合43天/其他28天)
      const gridPenalty = calculateGridPenalty(
        customer.ship_date,
        customer.grid_date,
        customer.brand,
        policy?.grid_penalty
      );

      // Monthly target bonus (simplified - would need monthly targets logic)
      const monthlyTargetBonus = 0;

      // Net profit calculation
      const netProfit = brandRevenue - totalCost - dealerFee - gridPenalty;

      return {
        customer_id: customer.id,
        brand: customer.brand || '未知',
        city: (policySnapshot?.city || policy?.city) || null,
        panel_count: panelCount,
        customer_type: customer.customer_type,
        dealer_id: customer.dealer_id,
        brand_revenue: brandRevenue,
        total_cost: totalCost,
        dealer_fee: dealerFee,
        grid_penalty: gridPenalty,
        monthly_target_bonus: monthlyTargetBonus,
        net_profit: netProfit,
      };
    });

    return { success: true, data: profitCalculations };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get profit summary statistics
export async function getProfitStatsAction(): Promise<{
  success: boolean;
  data?: {
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
  };
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const result = await getProfitCalculationsAction();

    if (!result.success || !result.data) {
      return { success: false, error: result.error || '获取利润数据失败' };
    }

    const calculations = result.data;

    // Calculate totals
    const totals = calculations.reduce(
      (acc, calc) => ({
        total_revenue: acc.total_revenue + calc.brand_revenue,
        total_cost: acc.total_cost + calc.total_cost,
        total_dealer_fee: acc.total_dealer_fee + calc.dealer_fee,
        total_penalty: acc.total_penalty + calc.grid_penalty,
        total_net_profit: acc.total_net_profit + calc.net_profit,
        customer_count: acc.customer_count + 1,
      }),
      {
        total_revenue: 0,
        total_cost: 0,
        total_dealer_fee: 0,
        total_penalty: 0,
        total_net_profit: 0,
        customer_count: 0,
      }
    );

    // Calculate brand stats
    const brandMap = new Map<string, {
      brand: string;
      customer_count: number;
      total_revenue: number;
      total_cost: number;
      total_profit: number;
    }>();

    calculations.forEach((calc) => {
      const existing = brandMap.get(calc.brand) || {
        brand: calc.brand,
        customer_count: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0,
      };

      existing.customer_count++;
      existing.total_revenue += calc.brand_revenue;
      existing.total_cost += calc.total_cost;
      existing.total_profit += calc.net_profit;

      brandMap.set(calc.brand, existing);
    });

    const brand_stats = Array.from(brandMap.values()).sort(
      (a, b) => b.total_profit - a.total_profit
    );

    return {
      success: true,
      data: {
        ...totals,
        avg_profit_per_customer:
          totals.customer_count > 0
            ? Math.round(totals.total_net_profit / totals.customer_count)
            : 0,
        brand_stats,
      },
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}

// Get all unique brands for filter
export async function getBrandsForFilterAction(): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  const permission = await checkAdminPermission();
  if (!permission.allowed) {
    return { success: false, error: permission.error };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('brand')
      .not('brand', 'is', null);

    if (error) {
      return { success: false, error: '获取品牌列表失败' };
    }

    const brands = [...new Set(data?.map((c) => c.brand).filter(Boolean) as string[])];

    return { success: true, data: brands.sort() };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: '系统错误' };
  }
}
