import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Mail,
  Send,
  Clock,
  Plus,
  LogOut,
  Slack,
  Zap,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/dashboard/compose', icon: Plus, label: 'Compose', color: 'primary' },
  { to: '/dashboard/scheduled', icon: Clock, label: 'Scheduled', color: 'sky' },
  { to: '/dashboard/sent', icon: Send, label: 'Sent', color: 'emerald' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-dark-900/50 backdrop-blur-xl border-r border-white/[0.06] flex flex-col relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-500/[0.02] to-transparent pointer-events-none" />
      
      {/* Logo */}
      <div className="relative p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-pink-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-pink-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-white text-xl tracking-tight">MailFlow</h1>
            <p className="text-xs text-slate-500">Email Scheduler</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 p-4 space-y-1.5">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-3">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = item.end 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
                  isActive
                    ? 'text-white bg-white/[0.08] shadow-lg shadow-black/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-gradient-to-b from-primary-400 to-pink-500" />
                  )}
                  
                  {/* Icon with glow */}
                  <div className={clsx(
                    'relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                    isActive 
                      ? 'bg-gradient-to-br from-primary-500/20 to-pink-500/20' 
                      : 'bg-white/[0.03] group-hover:bg-white/[0.06]'
                  )}>
                    <item.icon className={clsx(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'
                    )} />
                  </div>
                  
                  <span className="flex-1">{item.label}</span>
                  
                  {/* Arrow indicator */}
                  <ChevronRight className={clsx(
                    'w-4 h-4 transition-all duration-200',
                    isActive 
                      ? 'opacity-100 text-slate-400' 
                      : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
                  )} />
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Slack connection */}
      <div className="relative p-4 border-t border-white/[0.06]">
        {user?.slackConnection ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Slack className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-400">Connected</p>
              <p className="text-xs text-slate-500 truncate">{user.slackConnection.teamName}</p>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-400/50" />
          </div>
        ) : (
          <a
            href="/api/slack/connect"
            className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Slack className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-300 group-hover:text-amber-400 transition-colors">
                Connect Slack
              </p>
              <p className="text-xs text-slate-600">Get notifications</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
          </a>
        )}
      </div>

      {/* User profile */}
      <div className="relative p-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-pink-500 rounded-full blur opacity-50" />
              <img
                src={user.avatar}
                alt={user.name}
                className="relative w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
              />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-pink-500 rounded-full blur opacity-50" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
