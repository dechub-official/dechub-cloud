import type { Stage } from '@dechub/shared';

// Each stage gets its own tint; brass is kept for Won.
export const STAGE_STYLE: Record<Stage, { dot: string; pill: string; bar: string }> = {
  new: { dot: 'bg-[#8E86A8]', pill: 'bg-[#EFEDF4] text-[#4A4460]', bar: '#8E86A8' },
  contacted: { dot: 'bg-[#4F7CC4]', pill: 'bg-[#E6EEFA] text-[#2D528C]', bar: '#4F7CC4' },
  follow_up: { dot: 'bg-amber', pill: 'bg-amber-soft text-[#7A5013]', bar: '#B7791F' },
  qualified: { dot: 'bg-orchid', pill: 'bg-orchid-soft text-orchid-hover', bar: '#5B3CC4' },
  meeting: { dot: 'bg-[#2F8C93]', pill: 'bg-[#E1F2F3] text-[#1F6166]', bar: '#2F8C93' },
  proposal: { dot: 'bg-[#8A4FB0]', pill: 'bg-[#F3E9F9] text-[#64357F]', bar: '#8A4FB0' },
  won: { dot: 'bg-brass', pill: 'bg-brass-soft text-[#7C5A22]', bar: '#B98A3E' },
  lost: { dot: 'bg-rose', pill: 'bg-rose-soft text-rose', bar: '#B3364F' },
};
