import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignApi } from '../services/api';
import { useToast } from '../hooks/useToast';
import type { CsvParseResult } from '../types';
import {
  Upload,
  X,
  Plus,
  Mail,
  Clock,
  Gauge,
  Timer,
  Send,
  FileText,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Users,
  Calendar,
  Zap,
  Eye,
  Code,
} from 'lucide-react';
import { clsx } from 'clsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_KEY = 'outbox_compose_draft';

interface DraftData {
  subject: string;
  body: string;
  recipients: string[];
  delayBetweenEmails: number;
  rateLimit: number;
  savedAt: number;
}

function getDefaultStartTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ComposePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load draft from localStorage on mount
  const loadDraft = (): Partial<DraftData> => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as DraftData;
        // Only restore if saved within last 24 hours
        if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
          return draft;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  };

  const draft = loadDraft();

  const [subject, setSubject] = useState(draft.subject || '');
  const [body, setBody] = useState(draft.body || '');
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>(draft.recipients || []);
  const [startAt, setStartAt] = useState(getDefaultStartTime);
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(draft.delayBetweenEmails ?? 30);
  const [rateLimit, setRateLimit] = useState(draft.rateLimit ?? 100);
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Save draft to localStorage when form changes
  useEffect(() => {
    const draftData: DraftData = {
      subject,
      body,
      recipients,
      delayBetweenEmails,
      rateLimit,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
  }, [subject, body, recipients, delayBetweenEmails, rateLimit]);

  // Clear draft after successful submission
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  const addRecipient = useCallback(() => {
    const email = recipientInput.trim().toLowerCase();
    if (!email) return;

    if (!EMAIL_REGEX.test(email)) {
      setErrors((e) => ({ ...e, recipientInput: 'Invalid email address' }));
      return;
    }
    if (recipients.includes(email)) {
      setErrors((e) => ({ ...e, recipientInput: 'Email already added' }));
      return;
    }

    setRecipients((prev) => [...prev, email]);
    setRecipientInput('');
    setErrors((e) => ({ ...e, recipientInput: '' }));
  }, [recipientInput, recipients]);

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleRecipientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleCsvUpload = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Invalid file', 'Please upload a .csv file');
      return;
    }

    setCsvLoading(true);
    try {
      const content = await file.text();
      const res = await campaignApi.parseCsv(content);
      const result = res.data.data!;
      setCsvResult(result);

      const newEmails = result.emails.filter((e) => !recipients.includes(e));
      if (newEmails.length > 0) {
        setRecipients((prev) => [...prev, ...newEmails]);
        toast.success(
          `${newEmails.length} emails imported`,
          result.errors.length > 0
            ? `${result.errors.length} invalid rows skipped`
            : 'All emails valid',
        );
      } else {
        toast.info('No new emails to add', 'All emails from CSV already in the list');
      }
    } catch {
      toast.error('CSV parsing failed', 'Could not read the file');
    } finally {
      setCsvLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!subject.trim()) newErrors.subject = 'Subject is required';
    if (!body.trim()) newErrors.body = 'Email body is required';
    if (recipients.length === 0) newErrors.recipients = 'Add at least one recipient';
    if (!startAt) newErrors.startAt = 'Start time is required';
    
    const startDate = new Date(startAt);
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);
    if (startDate < now) {
      newErrors.startAt = 'Start time cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await campaignApi.create({
        subject: subject.trim(),
        body: body.trim(),
        recipients,
        startAt: new Date(startAt).toISOString(),
        delayBetweenEmails,
        hourlyLimit: rateLimit,
      });

      clearDraft(); // Clear saved draft on success
      toast.success('Campaign scheduled!', res.data.message || 'Emails have been queued');
      navigate('/dashboard/scheduled');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(
        'Failed to schedule campaign',
        error.response?.data?.error || 'Something went wrong',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalDuration =
    recipients.length > 1 ? ((recipients.length - 1) * delayBetweenEmails) : 0;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 opacity-0 animate-slide-up" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center gap-4 mb-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/30 to-pink-500/30 rounded-2xl blur-xl" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Create Campaign</h1>
            <p className="text-slate-500">Compose and schedule your email campaign</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipients Section */}
        <div 
          className="glass-card p-6 opacity-0 animate-slide-up"
          style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Recipients</h2>
              <p className="text-sm text-slate-500">Add email addresses manually or upload CSV</p>
            </div>
            {recipients.length > 0 && (
              <span className="ml-auto px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-sm font-semibold">
                {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}
              </span>
            )}
          </div>

          {/* Email input */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Enter email address..."
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleRecipientKeyDown}
                className={clsx(
                  'input-field pl-12',
                  errors.recipientInput && 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/20'
                )}
              />
            </div>
            <button
              type="button"
              onClick={addRecipient}
              className="btn-secondary px-5"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>

          {errors.recipientInput && (
            <p className="text-rose-400 text-sm mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {errors.recipientInput}
            </p>
          )}

          {/* CSV Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500/50', 'bg-primary-500/5'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('border-primary-500/50', 'bg-primary-500/5'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-primary-500/50', 'bg-primary-500/5');
              const file = e.dataTransfer.files[0];
              if (file) handleCsvUpload(file);
            }}
            className={clsx(
              'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer',
              'transition-all duration-300 group',
              csvLoading 
                ? 'border-primary-500/50 bg-primary-500/5' 
                : 'border-white/10 hover:border-primary-500/30 hover:bg-white/[0.02]'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvUpload(file);
              }}
            />
            
            {csvLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-primary-400 font-medium">Processing CSV file...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="w-8 h-8 text-primary-400" />
                </div>
                <p className="text-white font-medium mb-1">
                  Drop your CSV file here or <span className="text-primary-400">browse</span>
                </p>
                <p className="text-slate-500 text-sm">First column must contain email addresses</p>
              </>
            )}
          </div>

          {/* CSV Result */}
          {csvResult && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                <CheckCircle className="w-5 h-5" />
                CSV imported successfully
              </div>
              <div className="flex gap-6 text-sm">
                <span className="text-emerald-400">{csvResult.emails.length} valid</span>
                {csvResult.invalid.length > 0 && (
                  <span className="text-amber-400">{csvResult.invalid.length} skipped</span>
                )}
              </div>
            </div>
          )}

          {/* Recipients Tags */}
          {recipients.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400">Added recipients</p>
                <button
                  type="button"
                  onClick={() => setRecipients([])}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {recipients.map((email, index) => (
                  <span
                    key={email}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-slate-300 hover:border-primary-500/30 transition-all duration-200"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {errors.recipients && (
            <p className="text-rose-400 text-sm mt-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {errors.recipients}
            </p>
          )}
        </div>

        {/* Email Content Section */}
        <div 
          className="glass-card p-6 opacity-0 animate-slide-up"
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Email Content</h2>
                <p className="text-sm text-slate-500">Write your email subject and body</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={clsx(
                'btn-ghost text-sm',
                showPreview && 'bg-violet-500/10 text-violet-400'
              )}
            >
              {showPreview ? <Code className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>

          <div className="space-y-4">
            {/* Subject */}
            <div>
              <label className="label">Subject Line</label>
              <input
                type="text"
                placeholder="Enter a compelling subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={clsx(
                  'input-field text-lg font-medium',
                  errors.subject && 'border-rose-500/50'
                )}
              />
              {errors.subject && (
                <p className="text-rose-400 text-sm mt-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {errors.subject}
                </p>
              )}
            </div>

            {/* Body */}
            <div>
              <label className="label">
                Email Body
                <span className="text-slate-500 font-normal ml-2">HTML supported</span>
              </label>
              
              {showPreview ? (
                <div 
                  className="min-h-[250px] p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] prose prose-invert prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: body || '<p class="text-slate-500">Nothing to preview yet...</p>' }}
                />
              ) : (
                <textarea
                  placeholder="Write your email content here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className={clsx(
                    'input-field resize-none font-mono text-sm leading-relaxed',
                    errors.body && 'border-rose-500/50'
                  )}
                />
              )}
              {errors.body && (
                <p className="text-rose-400 text-sm mt-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {errors.body}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scheduling Section */}
        <div 
          className="glass-card p-6 opacity-0 animate-slide-up"
          style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Schedule & Delivery</h2>
              <p className="text-sm text-slate-500">Configure when and how emails are sent</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Start Time */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className={clsx('input-field', errors.startAt && 'border-rose-500/50')}
              />
              {errors.startAt && (
                <p className="text-rose-400 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.startAt}
                </p>
              )}
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Timer className="w-4 h-4 text-slate-500" />
                Delay Between Emails
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={3600}
                  value={delayBetweenEmails}
                  onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value, 10) || 0)}
                  className="input-field pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  seconds
                </span>
              </div>
              <p className="text-xs text-slate-500">0 = send all immediately</p>
            </div>

            {/* Rate Limit */}
            <div className="space-y-2">
              <label className="label flex items-center gap-2">
                <Gauge className="w-4 h-4 text-slate-500" />
                Rate Limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={rateLimit}
                  onChange={(e) => setRateLimit(parseInt(e.target.value, 10) || 1)}
                  className="input-field pr-24"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  per minute
                </span>
              </div>
              <p className="text-xs text-slate-500">Max emails sent per minute</p>
            </div>
          </div>

          {/* Schedule Preview */}
          {recipients.length > 0 && (
            <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-primary-500/5 to-pink-500/5 border border-primary-500/10">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary-400" />
                <h3 className="font-semibold text-white">Campaign Summary</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-white/[0.03]">
                  <p className="text-xs text-slate-500 mb-1">First Email</p>
                  <p className="text-sm text-white font-medium">
                    {new Date(startAt).toLocaleString('en-US', { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </p>
                </div>
                {recipients.length > 1 && (
                  <div className="p-3 rounded-lg bg-white/[0.03]">
                    <p className="text-xs text-slate-500 mb-1">Last Email</p>
                    <p className="text-sm text-white font-medium">
                      {new Date(new Date(startAt).getTime() + totalDuration * 1000).toLocaleString('en-US', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-white/[0.03]">
                  <p className="text-xs text-slate-500 mb-1">Duration</p>
                  <p className="text-sm text-white font-medium">{formatDuration(totalDuration)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03]">
                  <p className="text-xs text-slate-500 mb-1">Rate Limit</p>
                  <p className="text-sm text-white font-medium">{rateLimit}/min</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div 
          className="flex items-center justify-between pt-4 opacity-0 animate-slide-up"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary min-w-[180px]"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Schedule Campaign</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
