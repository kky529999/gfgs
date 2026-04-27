// Commission status types
export type CommissionStatus = 'pending' | 'applied' | 'approved' | 'paid';

export type CommissionType = 'entry' | 'closing';

// Status display labels
export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: '待申请',
  applied: '已申请',
  approved: '已审批',
  paid: '已支付',
};

// Commission type labels
export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  entry: '进场提成',
  closing: '闭环提成',
};

// Commission record interface
export interface Commission {
  id: string;
  customer_id: string;
  employee_id: string;
  commission_type: CommissionType;
  amount: number;
  status: CommissionStatus;
  applied_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  dingtalk_submitted_at: string | null;
  invoice_required: boolean;
  invoice_submitted: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Commission with relations
export interface CommissionWithRelations extends Commission {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    brand: string | null;
    capacity: string | null;
    salesperson_id: string;
    tech_assigned_id?: string;
    current_stage?: string;
    area?: string;
    address?: string;
    grid_date?: string | null;
    close_date?: string | null;
  };
  employee: {
    id: string;
    name: string;
    phone: string;
    title?: string;
  };
}

// Calculate commission input
export interface CalculateCommissionInput {
  customer_id: string;
  commission_type: CommissionType;
}

// Create commission input
export interface CreateCommissionInput {
  customer_id: string;
  commission_type: CommissionType;
  amount: number;
  note?: string;
}

// Update commission status input
export interface UpdateCommissionStatusInput {
  commission_id: string;
  status: CommissionStatus;
  note?: string;
}
