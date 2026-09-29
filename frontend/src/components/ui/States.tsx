import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return <Loader2 className={`${sizeClass} animate-spin text-primary-500`} />;
}

export function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary-600/20 flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
        <p className="text-slate-400 text-sm animate-pulse">Loading OutBox...</p>
      </div>
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-xl bg-dark-800/40">
          {[40, 25, 15, 20].map((w, j) => (
            <div
              key={j}
              className="shimmer h-4 rounded"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-600/10 flex items-center justify-center border border-primary-500/20">
        <Icon className="w-8 h-8 text-primary-400" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-slate-400 text-sm max-w-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
        <span className="text-3xl">⚠️</span>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-1">Something went wrong</h3>
        <p className="text-slate-400 text-sm max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Try Again
        </button>
      )}
    </div>
  );
}
