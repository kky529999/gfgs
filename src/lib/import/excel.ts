'use server';

import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthCookie } from '@/lib/auth/cookie';
import { parseExcelFile } from './excel-utils';
import type { CustomerStage, CustomerType, CreateCustomerInput } from '@/types/customer';

// Column mapping from Excel headers to customer fields
// Based on common Chinese Excel headers for customer management
const COLUMN_MAPPING: Record<string, keyof CreateCustomerInput> = {
  // Basic info
  '姓名': 'name',
  '客户姓名': 'name',
  '名称': 'name',
  '电话': 'phone',
  '手机': 'phone',
  '手机号': 'phone',
  '区域': 'area',
  '地区': 'area',
  '县': 'area',
  '乡镇': 'township',
  '地址': 'address',
  '详细地址': 'address',
  '装机容量': 'capacity',
  '容量': 'capacity',
  '千瓦': 'capacity',
  '品牌': 'brand',
  '组件品牌': 'brand',
  '板数': 'panel_count',
  '组件数量': 'panel_count',
  '房屋类型': 'house_type',
  '户用类型': 'house_type',
  // Business info
  '客户类型': 'customer_type',
  '类型': 'customer_type',
  '直客': 'customer_type',
  '二级商': 'customer_type',
  // Personnel
  '业务员': 'salesperson_id',
  '业务': 'salesperson_id',
  '负责业务员': 'salesperson_id',
  '技术': 'tech_assigned_id',
  '技术员': 'tech_assigned_id',
  '负责技术': 'tech_assigned_id',
  // Dates
  '现堪日期': 'survey_date',
  '现勘日期': 'survey_date',
  '勘测日期': 'survey_date',
  '日期': 'survey_date',
};

// Stage mapping
const STAGE_MAPPING: Record<string, CustomerStage> = {
  '现堪': 'survey',
  '现勘': 'survey',
  '勘测': 'survey',
  '设计': 'design',
  '设计出图': 'design',
  '建档': 'filing',
  '建档通过': 'filing',
  '备案': 'record',
  '并网资料': 'grid_materials',
  '发货': 'ship',
  '并网': 'grid',
  '闭环': 'close',
  '已完成': 'close',
};

// Customer type mapping
const TYPE_MAPPING: Record<string, CustomerType> = {
  '直客': 'direct',
  '直销': 'direct',
  '二级商': 'dealer',
  '二级': 'dealer',
  '分销': 'dealer',
};

/**
 * Map a row to CreateCustomerInput based on column mapping
 */
function mapRowToCustomer(
  row: Record<string, unknown>,
  employeeIdMap: Map<string, string>
): Partial<CreateCustomerInput> {
  const result: Partial<CreateCustomerInput> = {};

  for (const [excelHeader, value] of Object.entries(row)) {
    const normalizedHeader = excelHeader.trim();
    const fieldName = COLUMN_MAPPING[normalizedHeader];

    if (!fieldName) continue;

    // Skip empty values
    if (value === undefined || value === null || value === '') continue;

    const strValue = String(value).trim();

    switch (fieldName) {
      case 'name':
        result.name = strValue;
        break;
      case 'phone':
        // Normalize phone number
        result.phone = strValue.replace(/[^\d]/g, '');
        break;
      case 'area':
        result.area = strValue;
        break;
      case 'township':
        result.township = strValue;
        break;
      case 'address':
        result.address = strValue;
        break;
      case 'capacity':
        // Extract number from capacity string like "10kW" or "10千瓦"
        const capacityMatch = strValue.match(/^(\d+(?:\.\d+)?)/);
        if (capacityMatch) {
          result.capacity = capacityMatch[1];
        } else {
          result.capacity = strValue;
        }
        break;
      case 'brand':
        result.brand = strValue;
        break;
      case 'panel_count':
        const panelMatch = strValue.match(/^(\d+)/);
        if (panelMatch) {
          result.panel_count = parseInt(panelMatch[1], 10);
        }
        break;
      case 'house_type':
        result.house_type = strValue;
        break;
      case 'customer_type':
        result.customer_type = TYPE_MAPPING[strValue] || 'direct';
        break;
      case 'survey_date':
        result.survey_date = parseDate(strValue);
        break;
      case 'salesperson_id':
        // Map salesperson name to ID
        if (employeeIdMap.has(strValue)) {
          result.salesperson_id = employeeIdMap.get(strValue);
        }
        break;
      case 'tech_assigned_id':
        // Map tech name to ID
        if (employeeIdMap.has(strValue)) {
          result.tech_assigned_id = employeeIdMap.get(strValue);
        }
        break;
    }
  }

  return result;
}

/**
 * Parse various date formats to YYYY-MM-DD
 */
function parseDate(value: string): string | undefined {
  if (!value) return undefined;

  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Chinese date format: YYYY/MM/DD or YYYY年MM月DD日
  const chineseMatch = value.match(/(\d{4})[年/](\d{1,2})[月/](\d{1,2})/);
  if (chineseMatch) {
    const [, year, month, day] = chineseMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Excel serial date number
  const numValue = Number(value);
  if (!isNaN(numValue) && numValue > 25000 && numValue < 60000) {
    // Excel date serial number (days since 1900-01-01)
    const date = new Date(Math.round((numValue - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }

  return undefined;
}

/**
 * Detect the current stage from a row based on date columns
 */
function detectStage(row: Record<string, unknown>): CustomerStage {
  // Check for stage dates in the row
  const stageDateColumns: [string, CustomerStage][] = [
    ['现堪日期', 'survey'],
    ['现勘日期', 'survey'],
    ['勘测日期', 'survey'],
    ['设计日期', 'design'],
    ['建档日期', 'filing'],
    ['备案日期', 'record'],
    ['并网资料日期', 'grid_materials'],
    ['发货日期', 'ship'],
    ['并网日期', 'grid'],
    ['闭环日期', 'close'],
    ['完成日期', 'close'],
  ];

  let lastStage: CustomerStage = 'survey';

  for (const [column, stage] of stageDateColumns) {
    if (row[column] !== undefined && row[column] !== null && row[column] !== '') {
      lastStage = stage;
    }
  }

  return lastStage;
}

/**
 * Import customers from Excel file
 */
export async function importCustomersFromExcelAction(
  buffer: ArrayBuffer
): Promise<{
  success: boolean;
  imported?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
}> {
  const auth = await getAuthCookie();
  if (!auth) {
    return { success: false, error: '未登录' };
  }

  // Only admin and gm can import
  if (auth.role !== 'admin' && auth.role !== 'gm') {
    return { success: false, error: '无权导入' };
  }

  try {
    // Parse Excel
    const { headers, rows } = parseExcelFile(buffer);

    if (rows.length === 0) {
      return { success: false, error: 'Excel文件中没有数据' };
    }

    // Build employee name to ID map for salesperson/tech mapping
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, name, phone');

    const employeeIdMap = new Map<string, string>();
    employees?.forEach((emp) => {
      if (emp.name) employeeIdMap.set(emp.name, emp.id);
      if (emp.phone) employeeIdMap.set(emp.phone, emp.id);
    });

    // Process rows
    const customers: CreateCustomerInput[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is headers, and 1-indexed

      try {
        const mapped = mapRowToCustomer(row, employeeIdMap);

        // Validate required fields
        if (!mapped.name) {
          errors.push(`第${rowNumber}行: 缺少客户姓名`);
          continue;
        }

        // Set defaults
        const customer: CreateCustomerInput = {
          name: mapped.name,
          phone: mapped.phone,
          area: mapped.area,
          township: mapped.township,
          address: mapped.address,
          capacity: mapped.capacity,
          brand: mapped.brand,
          panel_count: mapped.panel_count,
          house_type: mapped.house_type,
          customer_type: mapped.customer_type || 'direct',
          salesperson_id: mapped.salesperson_id,
          tech_assigned_id: mapped.tech_assigned_id,
          current_stage: detectStage(row),
          survey_date: mapped.survey_date,
        };

        customers.push(customer);
      } catch (err) {
        errors.push(`第${rowNumber}行: 解析错误`);
      }
    }

    if (customers.length === 0) {
      return {
        success: false,
        error: '没有有效的客户数据可以导入',
        errors: errors.length > 0 ? errors : undefined,
      };
    }

    // Insert customers
    const { error: insertError } = await supabaseAdmin
      .from('customers')
      .insert(customers);

    if (insertError) {
      console.error('Import error:', insertError);
      return {
        success: false,
        error: `导入失败: ${insertError.message}`,
        errors: errors.length > 0 ? errors : undefined,
      };
    }

    return {
      success: true,
      imported: customers.length,
      skipped: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    console.error('Import error:', err);
    return {
      success: false,
      error: '导入过程出错',
    };
  }
}
