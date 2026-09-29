import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { campaignApi, emailApi, slackApi } from '../services/api';
import type { Campaign, SlackStatus } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  Mail,
  Clock,
  Send,
  Plus,
  TrendingUp,
  Users,
  Slack,
  Bell,
  ChevronRight,
  Zap,
  Sparkles,
  ArrowUpRight,
  Activity,
  Target,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  totalCampaigns: number;
  scheduledEmails: number;
  sentEmails: number;
  recentCampaigns: Campaign[];
}

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(easeOutQuart * end);
      
      if (current !== countRef.current) {
        countRef.current = current;
        setCount(current);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    startTime.current = null;
    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
}

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  color, 
  delay,
  loading 
}: { 
  icon: any; 
  label: string; 
  value: number | string; 
  trend?: string;
  color: string; 
  delay: number;
  loading: boolean;
}) {
  const numericValue = typeof value === 'number' ? value : 0;
  const animatedValue = useAnimatedCounter(loading ? 0 : numericValue, 1200);
  const displayValue = typeof value === 'string' ? value : animatedValue;

  const colorMap: Record<string, { bg: string; icon: string; glow: string; border: string }> = {
    indigo: { 
      bg: 'bg-indigo-500/10', 
      icon: 'text-indigo-400', 
      glow: 'group-hover:shadow-indigo-500/20',
      border: 'group-hover:border-indigo-500/30'
    },
    sky: { 
      bg: 'bg-sky-500/10', 
      icon: 'text-sky-400', 
      glow: 'group-hover:shadow-sky-500/20',
      border: 'group-hover:border-sky-500/30'
    },
    emerald: { 
      bg: 'bg-emerald-500/10', 
      icon: 'text-emerald-400', 
      glow: 'group-hover:shadow-emerald-500/20',
      border: 'group-hover:border-emerald-500/30'
    },
    pink: { 
      bg: 'bg-pink-500/10', 
      icon: 'text-pink-400', 
      glow: 'group-hover:shadow-pink-500/20',
      border: 'group-hover:border-pink-500/30'
    },
  };

  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div 
      className={`group relative glass-card p-6 opacity-0 animate-slide-up ${colors.border} ${colors.glow} hover:shadow-xl`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Glow effect */}
      <div className={`absolute -inset-px rounded-2xl ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10`} />
      
      {/* Icon */}
      <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-6 h-6 ${colors.icon}`} />
      </div>

      {/* Label */}
      <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>

      {/* Value */}
      {loading ? (
        <div className="shimmer h-9 w-20 rounded-lg" />
      ) : (
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-white tracking-tight">
            {displayValue}
          </span>
          {trend && (
            <span className="text-emerald-400 text-sm font-semibold flex items-center gap-0.5 mb-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user, refetch } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackResult = params.get('slack');
    if (slackResult === 'connected') {
      toast.success('Slack connected!', 'You will receive notifications when rate limits are reached.');
      refetch();
      window.history.replaceState({}, '', '/dashboard');
    } else if (slackResult === 'error') {
      const reason = params.get('reason') || 'Unknown error';
      toast.error('Slack connection failed', reason);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [campaignsRes, scheduledRes, sentRes, slackRes] = await Promise.all([
          campaignApi.list(),
          emailApi.scheduled(),
          emailApi.sent(),
          slackApi.status(),
        ]);

        const campaigns = campaignsRes.data.data || [];
        setStats({
          totalCampaigns: campaigns.length,
          scheduledEmails: scheduledRes.data.data?.length || 0,
          sentEmails: sentRes.data.data?.length || 0,
          recentCampaigns: campaigns.slice(0, 5),
        });
        setSlackStatus(slackRes.data.data || null);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const successRate = stats && stats.sentEmails + stats.scheduledEmails > 0
    ? `${Math.round((stats.sentEmails / (stats.sentEmails + stats.scheduledEmails)) * 100)}%`
    : '0%';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between opacity-0 animate-fade-in" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white">
              Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'there'}</span>
            </h1>
          </div>
          <p className="text-slate-500 ml-[52px]">
            Here's what's happening with your email campaigns today.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/compose')}
          className="btn-primary group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Slack Banner */}
      {!loading && !slackStatus?.connected && (
        <div 
          className="glass-card p-5 border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 flex items-center justify-between gap-4 opacity-0 animate-slide-up"
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Bell className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Enable Slack Notifications</p>
              <p className="text-sm text-slate-400">Get real-time alerts when campaigns hit rate limits</p>
            </div>
          </div>
          <a href="/api/slack/connect" className="btn-secondary group">
            <Slack className="w-4 h-4" />
            <span>Connect</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          icon={Target}
          label="Total Campaigns"
          value={stats?.totalCampaigns ?? 0}
          color="indigo"
          delay={150}
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label="Scheduled"
          value={stats?.scheduledEmails ?? 0}
          color="sky"
          delay={200}
          loading={loading}
        />
        <StatCard
          icon={Send}
          label="Emails Sent"
          value={stats?.sentEmails ?? 0}
          color="emerald"
          delay={250}
          loading={loading}
        />
        <StatCard
          icon={Activity}
          label="Success Rate"
          value={successRate}
          color="pink"
          delay={300}
          loading={loading}
        />
      </div>

      {/* Recent Campaigns */}
      <div 
        className="glass-card p-6 opacity-0 animate-slide-up"
        style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Recent Campaigns</h2>
              <p className="text-slate-500 text-sm">Your latest email campaigns</p>
            </div>
          </div>
          <Link to="/dashboard/scheduled" className="btn-ghost group text-sm">
            View all
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02]">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
                <div className="skeleton h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : stats?.recentCampaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-primary-500/20 rounded-3xl blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-600/20 to-pink-600/20 border border-primary-500/20 flex items-center justify-center">
                <Zap className="w-10 h-10 text-primary-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No campaigns yet</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">
              Create your first email campaign to start reaching your audience
            </p>
            <button
              onClick={() => navigate('/dashboard/compose')}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full">
              <thead className="bg-white/[0.02]">
                <tr>
                  <th className="table-header">Campaign</th>
                  <th className="table-header">Recipients</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Created</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentCampaigns.map((campaign, index) => (
                  <tr 
                    key={campaign.id} 
                    className="table-row group cursor-pointer"
                    onClick={() => navigate(`/dashboard/campaigns/${campaign.id}`)}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Mail className="w-4 h-4 text-primary-400" />
                        </div>
                        <span className="font-medium text-white group-hover:text-primary-400 transition-colors truncate max-w-[200px]">
                          {campaign.subject}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>{campaign._count?.emailJobs ?? 0}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={campaign.status} type="campaign" />
                    </td>
                    <td className="table-cell text-slate-500 text-sm">
                      {format(new Date(campaign.createdAt), 'MMM d, HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-0 animate-slide-up"
        style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
      >
        <Link 
          to="/dashboard/compose"
          className="glass-card p-5 group hover:border-primary-500/30 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
              <Plus className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">New Campaign</h3>
              <p className="text-sm text-slate-500">Create and schedule emails</p>
            </div>
          </div>
        </Link>

        <Link 
          to="/dashboard/scheduled"
          className="glass-card p-5 group hover:border-sky-500/30 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
              <Clock className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-sky-400 transition-colors">Scheduled</h3>
              <p className="text-sm text-slate-500">View pending emails</p>
            </div>
          </div>
        </Link>

        <Link 
          to="/dashboard/sent"
          className="glass-card p-5 group hover:border-emerald-500/30 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Send className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">Sent</h3>
              <p className="text-sm text-slate-500">Track delivered emails</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
