import { useToastSystem, ToastMessage } from '../../hooks/useToast';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';

const toastConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
  error: {
    icon: XCircle,
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    iconColor: 'text-rose-400',
    glow: 'shadow-rose-500/10',
  },
  info: {
    icon: Info,
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    iconColor: 'text-sky-400',
    glow: 'shadow-sky-500/10',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    iconColor: 'text-amber-400',
    glow: 'shadow-amber-500/10',
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'group relative flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-2xl',
        'shadow-2xl min-w-[320px] max-w-sm',
        'animate-slide-up',
        'bg-dark-900/95',
        config.bg,
        config.border,
        config.glow,
      )}
    >
      {/* Icon with glow */}
      <div className={clsx(
        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        config.bg
      )}>
        <Icon className={clsx('w-5 h-5', config.iconColor)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-semibold text-sm text-white">{toast.title}</p>
        {toast.description && (
          <p className="text-xs mt-1 text-slate-400 leading-relaxed">{toast.description}</p>
        )}
      </div>
      
      {/* Close button */}
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-white/5 overflow-hidden">
        <div 
          className={clsx('h-full rounded-full animate-shrink', config.iconColor.replace('text-', 'bg-'))}
          style={{ animationDuration: '5s' }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastSystem();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
