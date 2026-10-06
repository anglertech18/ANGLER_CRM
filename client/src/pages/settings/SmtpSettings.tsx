import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Save, RefreshCw, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Link } from 'react-router-dom';

export default function SmtpSettings() {
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [form, setForm] = useState({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    from_email: '',
    from_name: 'Angler iTech Solutions',
    reply_to: '',
  });

  const { data: config, isLoading } = useQuery<any>({
    queryKey: ['smtp-config'],
    queryFn: () => api.get('/smtp-config').then((res) => res.data?.data ?? null),
  });

  useEffect(() => {
    if (config) {
      setForm({
        host: config.host ?? '',
        port: config.port ?? 587,
        secure: config.secure === 1,
        username: config.username ?? '',
        password: config.password ?? '••••••••',
        from_email: config.from_email ?? '',
        from_name: config.from_name ?? 'Angler iTech Solutions',
        reply_to: config.reply_to ?? '',
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/smtp-config', data),
    onSuccess: () => {
      toast.success('SMTP Configuration saved');
      qc.invalidateQueries({ queryKey: ['smtp-config'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Save failed');
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.post('/smtp-config/test'),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? 'Connection verified successfully');
      qc.invalidateQueries({ queryKey: ['smtp-config'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Connection test failed');
    },
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveMutation.mutateAsync(form);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await testMutation.mutateAsync();
    } finally {
      setTesting(false);
    }
  };

  const setVal = (key: keyof typeof form, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="page-wrapper">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
            <Mail size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="page-title">Email / SMTP Configuration</h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              Configure outgoing email credentials and server connection properties
            </p>
          </div>
        </div>
        <Link to="/settings/brand-profile" className="btn btn-secondary btn-sm flex items-center gap-1.5">
          Brand Profile Settings &rarr;
        </Link>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSave} className="card px-5 py-4 space-y-3">
              <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">
                SMTP Server Settings
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="form-label">SMTP Host *</label>
                  <input
                    value={form.host}
                    onChange={(e) => setVal('host', e.target.value)}
                    className="form-input"
                    placeholder="smtp.gmail.com"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Port *</label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setVal('port', parseInt(e.target.value) || 587)}
                    className="form-input"
                    placeholder="587"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={form.secure}
                  onChange={(e) => setVal('secure', e.target.checked)}
                  className="rounded text-primary-600 cursor-pointer"
                />
                <label htmlFor="smtp-secure" className="text-[12px] font-medium text-slate-600 cursor-pointer select-none">
                  Use SSL/TLS (Secure Connection)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Username / Auth User *</label>
                  <input
                    type="email"
                    value={form.username}
                    onChange={(e) => setVal('username', e.target.value)}
                    className="form-input"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setVal('password', e.target.value)}
                      className="form-input pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide pt-2 border-t border-slate-100">
                Sender Properties
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">From Name *</label>
                  <input
                    value={form.from_name}
                    onChange={(e) => setVal('from_name', e.target.value)}
                    className="form-input"
                    placeholder="Angler iTech Solutions"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">From Email *</label>
                  <input
                    type="email"
                    value={form.from_email}
                    onChange={(e) => setVal('from_email', e.target.value)}
                    className="form-input"
                    placeholder="renewals@angleritech.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Reply-To Email (Optional)</label>
                <input
                  type="email"
                  value={form.reply_to}
                  onChange={(e) => setVal('reply_to', e.target.value)}
                  className="form-input"
                  placeholder="support@angleritech.com"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || !config}
                  className="btn btn-ghost"
                >
                  {testing ? (
                    <><RefreshCw size={13} className="animate-spin" /> Testing...</>
                  ) : (
                    'Test Connection'
                  )}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <><RefreshCw size={13} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={13} /> Save Configuration</>
                  )}
                </button>
              </div>
            </form>

            {/* Test connection result banner */}
            {config?.tested_at && (
              <div className={`card p-4 flex items-start gap-3 border-l-4 ${
                config.test_result === 'Connection successful'
                  ? 'border-l-emerald-500 bg-emerald-50/50'
                  : 'border-l-red-500 bg-red-50/50'
              }`}>
                {config.test_result === 'Connection successful' ? (
                  <ShieldCheck className="text-emerald-600 mt-0.5" size={18} />
                ) : (
                  <AlertCircle className="text-red-600 mt-0.5" size={18} />
                )}
                <div>
                  <p className={`text-[12px] font-semibold ${
                    config.test_result === 'Connection successful' ? 'text-emerald-800' : 'text-red-800'
                  }`}>
                    {config.test_result === 'Connection successful' ? 'SMTP Connection verified successfully' : 'SMTP Verification Failed'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{config.test_result}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Last tested: {new Date(config.tested_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar info */}
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <h4 className="text-[12px] font-bold text-slate-700">How Outbox Dispatch Works</h4>
              <ul className="text-[11px] text-slate-500 space-y-2 list-disc pl-4">
                <li>Outgoing notifications are created by background cron jobs and stored in the <strong>Outbox Queue</strong>.</li>
                <li>Items configured as <strong>Direct Send</strong> or items in the <strong>Draft Queue</strong> that have been <strong>Approved</strong> are marked as <code>QUEUED</code>.</li>
                <li>Every 5 minutes, the outbox processor picks up <code>QUEUED</code> items and sends them using these credentials.</li>
                <li>Upon successful send, state is marked <code>SENT</code>. If there is a transport failure, the system schedules retry attempts with exponential delays.</li>
              </ul>
            </div>

            <div className="card p-4 space-y-2 bg-slate-50 border-dashed border-slate-200">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Sender Preview</h4>
              <div className="text-[12px] bg-white border border-slate-100 rounded-lg p-2.5 font-mono">
                <span className="text-slate-400">From:</span> "{form.from_name || 'Angler support'}" &lt;{form.from_email || 'renewals@company.com'}&gt;
                {form.reply_to && (
                  <div className="mt-1">
                    <span className="text-slate-400">Reply-To:</span> {form.reply_to}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
