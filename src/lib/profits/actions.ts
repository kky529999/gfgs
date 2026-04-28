'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { refreshSessionAction } from '@/lib/auth/actions';
import type { Customer, BrandPolicy } from '@/types';
import type { ProfitCalculation } from '@/types';

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

    // Get active brand policies for reference
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
      const policy = customer.policy_snapshot || policyMap.get(customer.brand || '');
      const panelCount = customer.panel_count || 0;

      // Revenue: channel_fee (from policy) * panel_count
      const channelFee = policy?.channel_fee || 0;
      const brandRevenue = channelFee * panelCount;

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

      // Grid penalty (simplified - parse from policy if exists)
      let gridPenalty = 0;
      if (policy?.grid_penalty && customer.close_date) {
        const penaltyMatch = policy.grid_penalty.match(/(\d+)/);
        if (penaltyMatch) {
          gridPenalty = parseInt(penaltyMatch[1], 10) * 100; // Convert to yuan
        }
      }

      // Net profit calculation
      const netProfit = brandRevenue - totalCost - dealerFee - gridPenalty;

      return {
        customer_id: customer.id,
        brand: customer.brand || '未知',
        city: policy?.city || null,
        panel_count: panelCount,
        customer_type: customer.customer_type,
        dealer_id: customer.dealer_id,
        brand_revenue: brandRevenue,
        total_cost: totalCost,
        dealer_fee: dealerFee,
        grid_penalty: gridPenalty,
        monthly_target_bonus: 0, // Simplified for now
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
