// Growth fund types

export type FundTransactionType = 'deposit' | 'withdrawal' | 'adjustment';

export const FUND_TRANSACTION_LABELS: Record<FundTransactionType, string> = {
  deposit: '存入',
  withdrawal: '支取',
  adjustment: '调整',
};

// Fund transaction interface
export interface FundTransaction {
  id: string;
  employee_id: string;
  amount: number;
  transaction_type: FundTransactionType;
  balance_after: number;
  note: string | null;
  operator_id: string;
  created_at: string;
  updated_at: string;
}

// Fund transaction with relations
export interface FundTransactionWithRelations extends FundTransaction {
  employee: {
    id: string;
    name: string;
    phone: string;
  };
  operator: {
    id: string;
    name: string;
  };
}

// Fund balance
export interface FundBalance {
  employee_id: string;
  balance: number;
  last_transaction_at: string | null;
}

// Create transaction input
export interface CreateFundTransactionInput {
  employee_id: string;
  amount: number;
  transaction_type: FundTransactionType;
  note?: string;
}

// Fund statistics
export interface FundStats {
  total_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  employee_count: number;
}