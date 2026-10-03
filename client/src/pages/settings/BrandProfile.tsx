import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Upload, Palette, Building2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface BrandForm {
  company_name: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
  phone: string;
  website_url: string;
  primary_color: string;
  secondary_color: string;
  email_footer: string;
  logo_url: string;
}

const INITIAL: BrandForm = {
  company_name: '',
  sender_name: '',
  sender_email: '',
  reply_to_email: '',
  phone: '',
  website_url: '',
  primary_color: '#074388',
  secondary_color: '#6366f1',
  email_footer: 'This email was sent regarding your service renewal. Please contact us if you have questions.',
  logo_url: '',
};

export default function BrandProfile() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<BrandForm>(INITIAL);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['brand-profiles'],
    queryFn: () => api.get('/renewal-pricing/brand-profiles').then(r => r.data?.data ?? r.data),
  });

  useEffect(() => {
    if (profiles.length > 0) {
      const p = profiles[0];
      setProfileId(p.id);
      setForm({
        company_name: p.company_name ?? '',
        sender_name: p.sender_name ?? '',
        sender_email: p.sender_email ?? '',
        reply_to_email: p.reply_to_email ?? '',
        phone: p.phone ?? '',
        website_url: p.website_url ?? '',
        primary_color: p.primary_color ?? '#074388',
        secondary_color: p.secondary_color ?? '#6366f1',
        email_footer: p.email_footer ?? INITIAL.email_footer,
        logo_url: p.logo_url ?? '',
      });
    }
  }, [profiles]);

  const set = (key: keyof BrandForm, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const saveMutation = useMutation({
    mutationFn: (data: BrandForm) => profileId
      ? api.put(`/renewal-pricing/brand-profiles/${profileId}`, data)
      : api.post('/renewal-pricing/brand-profiles', data),
    onSuccess: (res) => {
      toast.success('Brand profile saved');
      if (!profileId) {
        const id = res.data?.id ?? res.data?.data?.id;
        if (id) setProfileId(id);
      }
      qc.invalidateQueries({ queryKey: ['brand-profiles'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Save failed'),
  });

  const handleSave = async () => {
    if (!form.company_name || !form.sender_email) {
      toast.error('Company name and sender email are required');
      return;
    }
    setSaving(true);
    try {
      await saveMutation.mutateAsync(form);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!profileId) {
      toast.error('Save the profile first before uploading a logo');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post(`/renewal-pricing/brand-profiles/${profileId}/logo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.logo_url ?? res.data?.data?.logo_url;
      if (url) {
        set('logo_url', url);
        toast.success('Logo uploaded');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Building2 size={18} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="page-title">Brand Profile</h1>
            <p className="text-[11px] text-slate-400 leading-tight">
              Logo, colors, and sender identity used in renewal emails
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(v => !v)}
            className="btn btn-ghost"
          >
            {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
            {showPreview ? 'Hide Preview' : 'Email Preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving
              ? <><RefreshCw size={14} className="animate-spin" /> Saving...</>
              : <><Save size={14} /> Save Profile</>
            }
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className={clsx('grid gap-4', showPreview ? 'grid-cols-2' : 'grid-cols-1 max-w-2xl')}>

          {/* Left: form */}
          <div className="space-y-4">

            {/* Logo */}
            <div className="card px-5 py-4">
              <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Company Logo</h3>
              <div className="flex items-center gap-4">
                <div
                  className="w-24 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0"
                  style={{ background: form.logo_url ? '#fff' : undefined }}
                >
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Brand logo" className="max-w-full max-h-full object-contain p-1" />
                  ) : (
                    <Building2 size={24} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn btn-ghost text-[12px]"
                  >
                    <Upload size={13} />
                    {uploading ? 'Uploading...' : 'Upload Logo'}
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    PNG, JPG, SVG · Recommended: 200×60px
                  </p>
                  {form.logo_url && (
                    <input
                      value={form.logo_url}
                      onChange={e => set('logo_url', e.target.value)}
                      className="form-input text-[11px] mt-2"
                      placeholder="Or paste logo URL"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Identity */}
            <div className="card px-5 py-4">
              <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Sender Identity</h3>
              <div className="space-y-3">
                <div>
                  <label className="form-label">Company Name *</label>
                  <input
                    value={form.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    className="form-input"
                    placeholder="Angler Itech Solutions"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Sender Name</label>
                    <input
                      value={form.sender_name}
                      onChange={e => set('sender_name', e.target.value)}
                      className="form-input"
                      placeholder="Angler Support"
                    />
                  </div>
                  <div>
                    <label className="form-label">Sender Email *</label>
                    <input
                      type="email"
                      value={form.sender_email}
                      onChange={e => set('sender_email', e.target.value)}
                      className="form-input"
                      placeholder="renewals@angleritech.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Reply-To Email</label>
                    <input
                      type="email"
                      value={form.reply_to_email}
                      onChange={e => set('reply_to_email', e.target.value)}
                      className="form-input"
                      placeholder="support@angleritech.com"
                    />
                  </div>
                  <div>
                    <label className="form-label">Support Phone</label>
                    <input
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      className="form-input"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Website URL</label>
                  <input
                    value={form.website_url}
                    onChange={e => set('website_url', e.target.value)}
                    className="form-input"
                    placeholder="https://angleritech.com"
                  />
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="card px-5 py-4">
              <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">
                <Palette size={12} className="inline mr-1.5" />
                Brand Colors
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={e => set('primary_color', e.target.value)}
                      className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      value={form.primary_color}
                      onChange={e => set('primary_color', e.target.value)}
                      className="form-input flex-1 font-mono text-[12px] uppercase"
                      placeholder="#074388"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.secondary_color}
                      onChange={e => set('secondary_color', e.target.value)}
                      className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      value={form.secondary_color}
                      onChange={e => set('secondary_color', e.target.value)}
                      className="form-input flex-1 font-mono text-[12px] uppercase"
                      placeholder="#6366f1"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
              {/* Color preview swatches */}
              <div className="flex gap-2 mt-3">
                <div
                  className="flex-1 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-medium"
                  style={{ background: form.primary_color }}
                >
                  Primary
                </div>
                <div
                  className="flex-1 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-medium"
                  style={{ background: form.secondary_color }}
                >
                  Secondary
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="card px-5 py-4">
              <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Email Footer</h3>
              <textarea
                rows={3}
                value={form.email_footer}
                onChange={e => set('email_footer', e.target.value)}
                className="form-input resize-none text-[12px]"
                placeholder="Footer text shown at the bottom of every renewal email..."
              />
            </div>
          </div>

          {/* Right: live preview */}
          {showPreview && (
            <div>
              <div className="card overflow-hidden sticky top-4">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[12px] font-semibold text-slate-700">Email Preview</p>
                  <p className="text-[10px] text-slate-400">How your branding appears in renewal emails</p>
                </div>
                <div className="p-4">
                  {/* Email mockup */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Header */}
                    <div
                      className="px-6 py-4 flex items-center justify-between"
                      style={{ background: form.primary_color }}
                    >
                      <div className="flex items-center gap-3">
                        {form.logo_url ? (
                          <img src={form.logo_url} alt="logo" className="h-8 max-w-[120px] object-contain" />
                        ) : (
                          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                            <Building2 size={16} className="text-white" />
                          </div>
                        )}
                        <span className="text-white font-semibold text-sm">{form.company_name || 'Your Company'}</span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 bg-white">
                      <p className="text-[13px] text-slate-800 font-medium mb-2">
                        Action Required: Your domain expires in <strong style={{ color: form.primary_color }}>30 days</strong>
                      </p>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        Dear <strong>Techsols Pvt Ltd</strong>,<br /><br />
                        This is a reminder that your domain <strong>techsols.com</strong> is due for renewal on
                        <strong> 17 Aug 2026</strong>. Renewal amount: <strong>₹1,200</strong>.
                      </p>
                      <div
                        className="mt-4 inline-block px-5 py-2 rounded-lg text-white text-[13px] font-semibold cursor-pointer"
                        style={{ background: form.secondary_color }}
                      >
                        Renew Now →
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 leading-relaxed">{form.email_footer}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        {form.phone && <span>📞 {form.phone}</span>}
                        {form.website_url && <span>🌐 {form.website_url}</span>}
                        {form.sender_email && <span>✉ {form.sender_email}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
