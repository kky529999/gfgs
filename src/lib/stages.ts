import type { StageKey, Brand, StatusColor } from '@/types';

export const STAGE_ORDER: StageKey[] = [
  'sign_contract',
  'survey',
  'design',
  'record_approved',
  'filing',
  'grid_docs',
  'shipping',
  'grid_connection',
  'closed',
  'acceptance',
];

export const STAGE_NAMES: Record<StageKey, string> = {
  sign_contract: '签合同',
  survey: '现勘',
  design: '设计',
  record_approved: '建档',
  filing: '备案',
  grid_docs: '并网资料',
  shipping: '发货',
  grid_connection: '并网',
  closed: '闭环',
  acceptance: '验收',
};

export const STAGE_DEFAULTS: Record<StageKey, number> = {
  sign_contract: 0,
  survey: 7,
  design: 3,
  record_approved: 7,
  filing: 14,
  grid_docs: 7,
  shipping: 0,
  grid_connection: 0,
  closed: 0,
  acceptance: 0,
};

export function getNextStageKey(current: StageKey): StageKey | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getStageDeadline(
  stage: StageKey,
  brand: Brand | undefined,
  prevDate: Date | null,
  shippingDate: Date | null,
  defaultDays?: number
): Date | null {
  if (stage === 'sign_contract' || stage === 'shipping' || stage === 'closed' || stage === 'acceptance') {
    return null;
  }

  if (stage === 'grid_connection') {
    if (!shippingDate) return null;
    const days = brand === '天合' ? 43 : 28;
    const d = new Date(shippingDate);
    d.setDate(d.getDate() + days);
    return d;
  }

  if (!prevDate) return null;
  const days = defaultDays ?? STAGE_DEFAULTS[stage] ?? 0;
  if (days === 0) return null;
  const d = new Date(prevDate);
  d.setDate(d.getDate() + days);
  return d;
}

export function calcStatusColor(remainingDays: number | undefined): StatusColor {
  if (remainingDays === undefined) return 'green';
  if (remainingDays < 0) return 'red';
  if (remainingDays < 3) return 'orange';
  if (remainingDays <= 7) return 'yellow';
  return 'green';
}
