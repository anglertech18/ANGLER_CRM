import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Mail, Edit2, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: 'bg-blue-50 text-blue-700',
  WHATSAPP: 'bg-emerald-50 text-emerald-700',
  SMS: 'bg-slate-50 text-slate-600',
};

interface NewTemplateForm {
  name: string;
  subject: string;
  channel: string;
  event_type: string;
}

const EVENT_TYPES = [
  'EXPIRY_REMINDER', 'OVERDUE_NOTICE', 'RENEWAL_CONFIRMATION',
  'PAYMENT_RECEIPT', 'SUSPENSION_WARNING', 'GENERAL',
];

const INITIAL_FORM: NewTemplateForm = {
  name: '', subject: '', channel: 'EMAIL', event_type: 'EXPIRY_REMINDER',
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<NewTemplateForm>(INITIAL_FORM);

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['renewal-templates'],
    queryFn: () => api.get('/renewal-templates').then(r => r.data?.data ?? r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: NewTemplateForm) => api.post('/renewal-templates', data),
    onSuccess: (res) => {
      toast.success('Template created');
      qc.invalidateQueries({ queryKey: ['renewal-templates'] });
      setShowCreate(false);
      setForm(INITIAL_FORM);
      const id = res.data?.id ?? res.data?.data?.id;
      if (id) navigate(`/renewals/templates/${id}/builder`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Create failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/renewal-templates/${id}`),
    onSuccess: () => {
      toast.success('Template deleted');
      qc.invalidateQueries({ queryKey: ['renewal-templates'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Delete failed'),
  });

  const handleDelete = (id: number, name: string) => {
    if (!window.confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(id);
  };

  const set = (key: keyof NewTemplateForm, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <Mail size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="page-title">Email Templates</h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              Visual GrapesJS builder — drag tokens, tables, and blocks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="btn btn-ghost" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            <Plus size={15} /> New Template
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Templates', value: templates.length, color: 'text-slate-700' },
          { label: 'Email', value: templates.filter((t: any) => t.channel === 'EMAIL').length, color: 'text-blue-600' },
          { label: 'Active', value: templates.filter((t: any) => t.is_active).length, color: 'text-emerald-600' },
          { label: 'With Builder', value: templates.filter((t: any) => t.editor_json).length, color: 'text-indigo-600' },
        ].map(s => (
          <div key={s.label} className="card px-4 py-3">
            <p className={clsx('text-2xl font-bold leading-tight', s.color)}>{s.value}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Template grid */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 text-center">
            <Mail size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No templates yet</p>
            <p className="text-slate-400 text-sm mt-1">Create your first email template to get started</p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary mt-4">
              <Plus size={14} /> New Template
            </button>
          </div>
        ) : (
          <table className="table-base w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Template</th>
                <th className="table-th">Subject</th>
                <th className="table-th">Event Type</th>
                <th className="table-th text-center">Channel</th>
                <th className="table-th text-center">Builder</th>
                <th className="table-th text-center">Updated</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t: any) => (
                <tr
                  key={t.id}
                  className="table-tr group cursor-pointer"
                  onClick={() => navigate(`/renewals/templates/${t.id}/builder`)}
                >
                  <td className="table-td">
                    <p className="text-[13px] font-semibold text-slate-800">{t.name}</p>
                    <p className="text-[11px] text-slate-400">ID: {t.id}</p>
                  </td>
                  <td className="table-td">
                    <p className="text-[12px] text-slate-700 max-w-xs truncate">{t.subject}</p>
                  </td>
                  <td className="table-td">
                    <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {(t.event_type ?? 'GENERAL').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="table-td text-center">
                    <span className={clsx(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full',
                      CHANNEL_COLORS[t.channel] ?? 'bg-slate-50 text-slate-600',
                    )}>
                      {t.channel ?? 'EMAIL'}
                    </span>
                  </td>
                  <td className="table-td text-center">
                    {t.editor_json ? (
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                        Visual
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">HTML only</span>
                    )}
                  </td>
                  <td className="table-td text-center">
                    <p className="text-[11px] text-slate-500">
                      {t.updated_at ? dayjs(t.updated_at).format('DD MMM YY') : '—'}
                    </p>
                  </td>
                  <td className="table-td" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate(`/renewals/templates/${t.id}/builder`)}
                        className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Open builder"
                      >
                        <ExternalLink size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-[15px] font-semibold text-slate-800">New Email Template</h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Create the template, then design it in the visual builder
              </p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="form-label">Template Name *</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="form-input"
                  placeholder="e.g. 30-Day Domain Expiry Notice"
                  autoFocus
                />
              </div>
              <div>
                <label className="form-label">Email Subject *</label>
                <input
                  value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                  className="form-input"
                  placeholder="e.g. Action Required: {{domain_name}} expires in 30 days"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Channel</label>
                  <select value={form.channel} onChange={e => set('channel', e.target.value)} className="form-select">
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Event Type</label>
                  <select value={form.event_type} onChange={e => set('event_type', e.target.value)} className="form-select">
                    {EVENT_TYPES.map(e => (
                      <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => { setShowCreate(false); setForm(INITIAL_FORM); }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                disabled={!form.name || !form.subject || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
                className="btn btn-primary"
              >
                {createMutation.isPending ? 'Creating...' : 'Create & Open Builder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
