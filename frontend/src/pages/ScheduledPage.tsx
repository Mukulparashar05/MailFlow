import { useState, useEffect, useCallback } from 'react';
import { emailApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import type { EmailJob } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingTable, EmptyState, ErrorState } from '../components/ui/States';
import { 
  Clock, 
  RefreshCw, 
  Mail, 
  Timer, 
  Calendar,
  Zap,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

export function ScheduledPage() {
  const toast = useToast();
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await emailApi.scheduled();
      setEmails(res.data.data || []);
    } catch {
      const msg = 'Failed to load scheduled emails';
      setError(msg);
      if (!silent) toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh every 10 seconds for real-time status updates
    const interval = setInterval(() => load(true), 10000);
    return () => clearInterval(interval);
  }, [load]);

  const filteredEmails = emails.filter(email => 
    email.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.campaign?.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group emails by campaign
  const emailsByCampaign = filteredEmails.reduce((acc, email) => {
    const campaignId = email.campaignId || 'unknown';
    if (!acc[campaignId]) {
      acc[campaignId] = {
        subject: email.campaign?.subject || 'Unknown Campaign',
        emails: [],
      };
    }
    acc[campaignId].emails.push(email);
    return acc;
  }, {} as Record<string, { subject: string; emails: EmailJob[] }>);

  const nextEmail = emails.length > 0 
    ? emails.reduce((earliest, email) => 
        new Date(email.scheduledAt) < new Date(earliest.scheduledAt) ? email : earliest
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0 animate-slide-up"
        style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500/20 rounded-2xl blur-xl" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
              <Clock className="w-7 h-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Scheduled Emails</h1>
            <p className="text-slate-500">
              {emails.length} email{emails.length !== 1 ? 's' : ''} queued for delivery
            </p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="btn-secondary"
        >
          <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {!loading && emails.length > 0 && (
        <div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-0 animate-slide-up"
          style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
        >
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{emails.length}</p>
              <p className="text-sm text-slate-500">Total Queued</p>
            </div>
          </div>
          
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{Object.keys(emailsByCampaign).length}</p>
              <p className="text-sm text-slate-500">Active Campaigns</p>
            </div>
          </div>
          
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Timer className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white truncate">
                {nextEmail 
                  ? formatDistanceToNow(new Date(nextEmail.scheduledAt), { addSuffix: true })
                  : '-'
                }
              </p>
              <p className="text-sm text-slate-500">Next Email</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {!loading && emails.length > 0 && (
        <div 
          className="opacity-0 animate-slide-up"
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by email or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12 w-full"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div 
        className="glass-card overflow-hidden opacity-0 animate-slide-up"
        style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
      >
        {loading ? (
          <div className="p-6">
            <LoadingTable rows={6} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => load()} />
        ) : emails.length === 0 ? (
          <div className="py-20 text-center">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-sky-500/20 rounded-3xl blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-600/20 to-cyan-600/20 border border-sky-500/20 flex items-center justify-center">
                <Zap className="w-10 h-10 text-sky-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No scheduled emails</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Emails you schedule will appear here. Create a campaign to get started.
            </p>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="py-16 text-center">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No results found</h3>
            <p className="text-slate-500">Try adjusting your search query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Scheduled
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Attempts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredEmails.map((email, index) => (
                  <tr 
                    key={email.id} 
                    className="group hover:bg-white/[0.02] transition-colors duration-200"
                    style={{ 
                      animationDelay: `${200 + index * 30}ms`,
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <Mail className="w-4 h-4 text-sky-400" />
                        </div>
                        <span className="font-medium text-white group-hover:text-sky-400 transition-colors">
                          {email.recipientEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400 max-w-[200px] truncate block">
                        {email.campaign?.subject || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p className="text-sm text-white font-medium">
                          {format(new Date(email.scheduledAt), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(email.scheduledAt), 'HH:mm:ss')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={email.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx(
                        'inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-medium',
                        email.attempts === 0 
                          ? 'bg-slate-500/10 text-slate-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      )}>
                        {email.attempts}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
