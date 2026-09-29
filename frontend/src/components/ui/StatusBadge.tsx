import { clsx } from 'clsx';
import type { EmailStatus, CampaignStatus } from '../../types';

const statusConfig: Record<string, { bg: string; text: string; dot: string; glow?: string }> = {
  PENDING: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-400', 
    dot: 'bg-amber-400',
    glow: 'shadow-amber-500/20'
  },
  SCHEDULED: { 
    bg: 'bg-sky-500/10', 
    text: 'text-sky-400', 
    dot: 'bg-sky-400',
    glow: 'shadow-sky-500/20'
  },
  PROCESSING: { 
    bg: 'bg-violet-500/10', 
    text: 'text-violet-400', 
    dot: 'bg-violet-400 animate-pulse',
    glow: 'shadow-violet-500/20'
  },
  SENT: { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-400', 
    dot: 'bg-emerald-400',
    glow: 'shadow-emerald-500/20'
  },
  FAILED: { 
    bg: 'bg-rose-500/10', 
    text: 'text-rose-400', 
    dot: 'bg-rose-400',
    glow: 'shadow-rose-500/20'
  },
  RUNNING: { 
    bg: 'bg-cyan-500/10', 
    text: 'text-cyan-400', 
    dot: 'bg-cyan-400 animate-pulse',
    glow: 'shadow-cyan-500/20'
  },
  COMPLETED: { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-400', 
    dot: 'bg-emerald-400',
    glow: 'shadow-emerald-500/20'
  },
  DRAFT: { 
    bg: 'bg-slate-500/10', 
    text: 'text-slate-400', 
    dot: 'bg-slate-400',
    glow: 'shadow-slate-500/20'
  },
  PAUSED: { 
    bg: 'bg-slate-500/10', 
    text: 'text-slate-400', 
    dot: 'bg-slate-400',
    glow: 'shadow-slate-500/20'
  },
};

interface BadgeProps {
  status: EmailStatus | CampaignStatus;
  type?: 'email' | 'campaign';
}

export function StatusBadge({ status, type = 'email' }: BadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <span 
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold',
        'border border-white/[0.06] transition-all duration-200',
        'hover:scale-105 hover:shadow-lg',
        config.bg,
        config.text,
        config.glow
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      <span className="capitalize">{status.toLowerCase()}</span>
    </span>
  );
}
