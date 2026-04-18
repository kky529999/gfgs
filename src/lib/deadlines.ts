import type { Customer, CustomerWithDeadline, StageDefinition } from '@/types';
import { STAGE_ORDER, getStageDeadline, calcStatusColor } from './stages';

let stageDefs: StageDefinition[] = [];
let stageDefsLoaded = false;

export async function loadStageDefinitions(fetchFn: () => Promise<StageDefinition[]>) {
  if (!stageDefsLoaded) {
    stageDefs = await fetchFn();
    stageDefsLoaded = true;
  }
  return stageDefs;
}

export function getDefaultDays(stageKey: string, defs: StageDefinition[]): number | undefined {
  const def = defs.find(d => d.stage_key === stageKey);
  return def?.default_days;
}

function toDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function getStageDate(customer: Customer, stage: string): Date | null {
  const map: Record<string, string | undefined> = {
    sign_contract: customer.contract_date,
    survey: customer.survey_date,
    design: customer.design_date,
    record_approved: customer.record_approved_date,
    filing: customer.filing_date,
    grid_docs: customer.grid_docs_date,
    shipping: customer.shipping_date,
    grid_connection: customer.grid_date,
    closed: customer.closed_date,
    acceptance: customer.acceptance_date,
  };
  return toDate(map[stage]);
}

function getPrevStageDate(customer: Customer, stage: string): Date | null {
  const idx = STAGE_ORDER.indexOf(stage as any);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    const d = getStageDate(customer, STAGE_ORDER[i]);
    if (d) return d;
  }
  return null;
}

export function enrichCustomer(
  customer: Customer,
  defs: StageDefinition[] = []
): CustomerWithDeadline {
  const current = customer.current_stage;

  if (current === 'closed' || current === 'acceptance' || current === 'sign_contract') {
    return {
      ...customer,
      status: 'green',
      remaining_days: undefined,
      deadline: undefined,
    };
  }

  const shippingDate = getStageDate(customer, 'shipping');
  const prevDate = getPrevStageDate(customer, current);
  const defaultDays = getDefaultDays(current, defs);

  const deadline = getStageDeadline(current, customer.brand, prevDate, shippingDate, defaultDays);

  if (!deadline) {
    return { ...customer, status: 'green', remaining_days: undefined, deadline: undefined };
  }

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const status = calcStatusColor(remainingDays);

  return {
    ...customer,
    status,
    remaining_days: remainingDays,
    deadline: deadline.toISOString().split('T')[0],
  };
}
