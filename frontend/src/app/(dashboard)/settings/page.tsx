'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
  Bell, BellOff, Download, Trash2, Shield,
  ChevronRight, Loader2, FileSpreadsheet,
  AlertTriangle, CheckCircle2, Eye, EyeOff,
} from 'lucide-react';
import Footer from '@/components/Footer';

interface Settings {
  id: string;
  name: string;
  email: string;
  reminderEnabled: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingReminder, setTogglingReminder] = useState(false);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Export state
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    api.get('/settings').then(r => { setSettings(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleToggleReminder = async () => {
    setTogglingReminder(true);
    try {
      const { data } = await api.patch('/settings/reminder');
      setSettings(s => s ? { ...s, reminderEnabled: data.reminderEnabled } : s);
      toast.success(data.reminderEnabled ? 'Deadline reminders enabled!' : 'Reminders disabled');
    } catch { toast.error('Failed to update setting'); }
    finally { setTogglingReminder(false); }
  };

  const handleExport = async (range: '30days' | 'quarter') => {
    setExporting(range);
    try {
      const res = await api.get(`/settings/export?range=${range}`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `taskflow-${range}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(null); }
  };

  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.delete('/settings/account', { data: { confirmEmail: deleteEmail, password: deletePassword } });
      toast.success('Account deleted');
      await logout();
      router.push('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete account';
      toast.error(msg);
    } finally { setDeleting(false); }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Manage your account, notifications and data
          </p>
        </div>

        {/* Account info */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white"
              style={{ background: 'var(--accent)' }}>
              {settings?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{settings?.name}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{settings?.email}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Member since {settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>
          </div>
        </div>

        {/* ── Notifications ── */}
        <SectionHeader icon={<Bell size={16} />} title="Notifications" />
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: settings?.reminderEnabled ? 'rgba(99,102,241,0.15)' : 'var(--bg-input)' }}>
                {settings?.reminderEnabled
                  ? <Bell size={16} style={{ color: 'var(--accent)' }} />
                  : <BellOff size={16} style={{ color: 'var(--text-muted)' }} />}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Deadline Reminders
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Get an email the day before a task is due
                </p>
              </div>
            </div>
            <Toggle
              enabled={settings?.reminderEnabled || false}
              loading={togglingReminder}
              onToggle={handleToggleReminder}
            />
          </div>

          {settings?.reminderEnabled && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--accent)', marginTop: 1 }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Reminders are sent daily at <strong style={{ color: 'var(--text-primary)' }}>8:00 AM</strong> to <strong style={{ color: 'var(--text-primary)' }}>{settings.email}</strong> for tasks due the next day.
              </p>
            </div>
          )}
        </div>

        {/* ── Export ── */}
        <SectionHeader icon={<FileSpreadsheet size={16} />} title="Export Data" />
        <div className="card p-5 mb-4 space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Download your tasks as a CSV file — opens in Excel, Google Sheets, or any spreadsheet app.
          </p>

          {[
            { range: '30days' as const, label: 'Last 30 Days', desc: 'All tasks created in the past month' },
            { range: 'quarter' as const, label: 'Last Quarter',  desc: 'All tasks from the past 3 months' },
          ].map(({ range, label, desc }) => (
            <div key={range} className="flex items-center justify-between p-4 rounded-xl transition-all"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <Download size={14} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </div>
              <button onClick={() => handleExport(range)} disabled={exporting === range}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.22)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')}>
                {exporting === range
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Download size={12} />}
                {exporting === range ? 'Exporting…' : 'Download'}
              </button>
            </div>
          ))}
        </div>

        {/* ── Danger Zone ── */}
        <SectionHeader icon={<Shield size={16} />} title="Danger Zone" danger />
        <div className="card p-5 mb-4" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Trash2 size={16} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Delete Account</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            <button onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.25)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}>
              <ChevronRight size={12} /> Delete
            </button>
          </div>
        </div>
      </main>

      {/* ── Delete Account Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
          <div className="w-full max-w-md card p-6 animate-scale-in"
            style={{ borderColor: 'rgba(239,68,68,0.3)' }}>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.12)' }}>
                <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Delete Account</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This action is irreversible</p>
              </div>
            </div>

            <div className="p-3 rounded-lg mb-5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-sm" style={{ color: '#fca5a5' }}>
                All your profiles, tasks, and data will be <strong>permanently deleted</strong>. This cannot be undone.
              </p>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="label">
                  Type your email address to confirm
                </label>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  Enter: <code style={{ color: 'var(--accent)', background: 'var(--bg-input)', padding: '1px 6px', borderRadius: 4 }}>{settings?.email}</code>
                </p>
                <input
                  type="email"
                  className="input"
                  placeholder={settings?.email}
                  value={deleteEmail}
                  onChange={e => setDeleteEmail(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="label">Your password</label>
                <div className="relative">
                  <input
                    type={showDeletePw ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowDeletePw(!showDeletePw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}>
                    {showDeletePw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowDeleteModal(false); setDeleteEmail(''); setDeletePassword(''); }}
                  className="btn-ghost flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || deleteEmail !== settings?.email || !deletePassword}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm text-white transition-all"
                  style={{
                    background: deleteEmail === settings?.email && deletePassword ? 'var(--danger)' : 'rgba(239,68,68,0.3)',
                    cursor: deleteEmail === settings?.email && deletePassword ? 'pointer' : 'not-allowed',
                  }}>
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Deleting…' : 'Delete my account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    <Footer />
    </>
    
  );
}

// ── Sub-components ──

function SectionHeader({ icon, title, danger }: { icon: React.ReactNode; title: string; danger?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-2 px-1">
      <span style={{ color: danger ? 'var(--danger)' : 'var(--text-muted)' }}>{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: danger ? 'var(--danger)' : 'var(--text-muted)' }}>{title}</span>
    </div>
  );
}

function Toggle({ enabled, loading, onToggle }: { enabled: boolean; loading: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} disabled={loading}
      className="relative flex-shrink-0 transition-all duration-200"
      style={{ width: 44, height: 24 }}
      aria-label="Toggle">
      <div className="w-full h-full rounded-full transition-all duration-200"
        style={{ background: enabled ? 'var(--accent)' : 'var(--bg-input)', border: '1px solid var(--border)' }} />
      <div className="absolute top-0.5 transition-all duration-200 flex items-center justify-center"
        style={{
          width: 20, height: 20,
          borderRadius: '50%',
          background: 'white',
          left: enabled ? 22 : 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}>
        {loading && <Loader2 size={10} className="animate-spin" style={{ color: 'var(--accent)' }} />}
      </div>
    </button>
  );
}