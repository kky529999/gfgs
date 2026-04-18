import type { StageKey } from '@/types';
import { STAGE_NAMES } from '@/lib/stages';

const STAGE_COLORS: Record<StageKey, string> = {
  sign_contract: 'bg-blue-100 text-blue-800',
  survey: 'bg-purple-100 text-purple-800',
  design: 'bg-indigo-100 text-indigo-800',
  record_approved: 'bg-violet-100 text-violet-800',
  filing: 'bg-amber-100 text-amber-800',
  grid_docs: 'bg-orange-100 text-orange-800',
  shipping: 'bg-cyan-100 text-cyan-800',
  grid_connection: 'bg-teal-100 text-teal-800',
  closed: 'bg-emerald-100 text-emerald-800',
  acceptance: 'bg-green-100 text-green-800',
};

interface StageTagProps {
  stage: StageKey;
  className?: string;
}

export default function StageTag({ stage, className = '' }: StageTagProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[stage]} ${className}`}>
      {STAGE_NAMES[stage]}
    </span>
  );
}
