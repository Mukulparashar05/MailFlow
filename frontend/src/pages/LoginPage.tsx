import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/api';
import { LoadingPage } from '../components/ui/States';
import { Mail, Shield, Zap, Clock, BarChart3, Sparkles, ArrowRight } from 'lucide-react';

const features = [
  { icon: Mail, title: 'Smart Scheduling', desc: 'Schedule emails with precise delays', color: 'primary' },
  { icon: Clock, title: 'Rate Limiting', desc: 'Distributed hourly rate control', color: 'sky' },
  { icon: Shield, title: 'Idempotent Sends', desc: 'Never send the same email twice', color: 'emerald' },
  { icon: BarChart3, title: 'Real-time Tracking', desc: 'Monitor sent and scheduled emails', color: 'violet' },
];

const colorMap: Record<string, string> = {
  primary: 'from-primary-500/20 to-pink-500/20 text-primary-400',
  sky: 'from-sky-500/20 to-cyan-500/20 text-sky-400',
  emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
  violet: 'from-violet-500/20 to-purple-500/20 text-violet-400',
};

export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) return <LoadingPage />;

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-dark-900/50 backdrop-blur-xl border-r border-white/[0.06] relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute top-1/2 -right-20 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute -bottom-40 left-1/4 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-pink-500 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-pink-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white">MailFlow</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-8">
          <div className="opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-primary-400">Email Scheduler Pro</span>
            </div>
            <h2 className="text-5xl font-bold text-white leading-tight">
              Email scheduling,{' '}
              <span className="gradient-text">done right.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-md mt-6">
              Schedule and automate email campaigns with distributed rate limiting,
              idempotent delivery, and real-time Slack notifications.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 opacity-0 animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            {features.map((f, i) => (
              <div 
                key={f.title} 
                className="glass-card p-4 group hover:border-white/10 transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[f.color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-slate-600 text-sm opacity-0 animate-fade-in" style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
          Built with BullMQ, Redis, PostgreSQL & React
        </p>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-pink-500 rounded-xl blur-lg opacity-50" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-pink-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">MailFlow</span>
          </div>

          {/* Card */}
          <div className="glass-card p-8 space-y-6 opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">Welcome back</h1>
              <p className="text-slate-400 mt-2 text-sm">
                Sign in to access your email scheduler
              </p>
            </div>

            {/* Google OAuth button */}
            <a
              href={authApi.googleLoginUrl}
              id="google-login-btn"
              className="group relative flex items-center justify-center gap-3 w-full py-4 px-6 
                         bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl 
                         transition-all duration-300 shadow-lg hover:shadow-2xl 
                         hover:-translate-y-1 active:translate-y-0
                         overflow-hidden"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </a>

            <p className="text-center text-xs text-slate-500">
              By signing in, you agree to our terms of service. No passwords stored.
            </p>
          </div>

          {/* Error from URL param */}
          {new URLSearchParams(window.location.search).get('error') && (
            <div className="glass-card p-4 border-rose-500/20 bg-rose-500/5 text-center space-y-1 opacity-0 animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
              <p className="text-rose-400 text-sm font-semibold">Authentication Error</p>
              <p className="text-slate-400 text-xs">
                Google OAuth failed. Please check configuration and try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
