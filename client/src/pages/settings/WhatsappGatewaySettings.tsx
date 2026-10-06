import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Send,
  LogOut,
  Star,
  Smartphone,
  Building2,
  Clock,
  ShieldCheck,
  X,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Link } from 'react-router-dom';

interface WhatsappSession {
  id: number;
  session_name: string;
  brand_key: string;
  phone_number?: string;
  company_id?: number;
  is_default: boolean;
  status: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED';
  qr_code_base64?: string;
  connected_at?: string;
  last_active_at?: string;
  error_message?: string;
  company?: { id: number; name: string };
}

export default function WhatsappGatewaySettings() {
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeQrSession, setActiveQrSession] = useState<WhatsappSession | null>(null);
  const [showTestModal, setShowTestModal] = useState<WhatsappSession | null>(null);

  // New session form state
  const [newSession, setNewSession] = useState({
    session_name: '',
    brand_key: '',
    phone_number: '',
    company_id: '',
    is_default: false,
  });

  // Test message form state
  const [testForm, setTestForm] = useState({
    phone_number: '',
    message: 'Hello from Angler CRM! Your WhatsApp Gateway is operating smoothly.',
  });

  // Fetch sessions
  const { data: sessions = [], isLoading, refetch } = useQuery<WhatsappSession[]>({
    queryKey: ['whatsapp-sessions'],
    queryFn: () => api.get('/whatsapp-web/sessions').then((res) => res.data?.data ?? []),
    refetchInterval: activeQrSession ? 3000 : 10000, // Poll faster if QR modal is open
  });

  // Fetch companies for dropdown
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['companies-list'],
    queryFn: () => api.get('/masters/companies').then((res) => res.data?.data ?? res.data ?? []),
  });

  // Keep active QR session updated from polling data
  useEffect(() => {
    if (activeQrSession) {
      const updated = sessions.find((s) => s.id === activeQrSession.id);
      if (updated) {
        setActiveQrSession(updated);
        if (updated.status === 'CONNECTED') {
          toast.success(`Successfully paired ${updated.session_name}!`);
        }
      }
    }
  }, [sessions]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/whatsapp-web/sessions', data),
    onSuccess: () => {
      toast.success('New WhatsApp Gateway created');
      setShowAddModal(false);
      setNewSession({ session_name: '', brand_key: '', phone_number: '', company_id: '', is_default: false });
      qc.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create session');
    },
  });

  const connectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/whatsapp-web/sessions/${id}/connect`),
    onSuccess: (_, id) => {
      toast.loading('Generating QR Code...', { id: 'qr-loader' });
      setTimeout(() => {
        toast.dismiss('qr-loader');
        refetch().then((res) => {
          const sess = res.data?.find((s) => s.id === id);
          if (sess) setActiveQrSession(sess);
        });
      }, 2000);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to connect');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => api.post(`/whatsapp-web/sessions/${id}/default`),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? 'Default gateway updated');
      qc.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/whatsapp-web/sessions/${id}/disconnect`),
    onSuccess: () => {
      toast.success('Session disconnected');
      if (activeQrSession) setActiveQrSession(null);
      qc.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: (data: any) => api.post('/whatsapp-web/test-send', data),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? 'Test message sent!');
      setShowTestModal(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to send test message');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSession.session_name || !newSession.brand_key) {
      toast.error('Session Name and Brand Key are required');
      return;
    }
    createMutation.mutate({
      ...newSession,
      company_id: newSession.company_id ? Number(newSession.company_id) : null,
    });
  };

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.phone_number || !testForm.message) {
      toast.error('Phone number and message are required');
      return;
    }
    sendTestMutation.mutate({
      phone_number: testForm.phone_number,
      message: testForm.message,
      brand_key: showTestModal?.brand_key,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link to="/renewals/dashboard" className="hover:text-indigo-600">Renewals</Link>
            <span>/</span>
            <span className="font-medium text-slate-700">WhatsApp Gateway</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-emerald-600" />
            WhatsApp Web Gateway Manager
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Pair physical WhatsApp Business accounts via QR code to send automated background renewal reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            Refresh Status
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-md hover:shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Add New Gateway
          </button>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3.5 text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-emerald-900">Solution 2: Physical WhatsApp Business App Co-existence</p>
          <p className="text-emerald-800 leading-relaxed">
            Your physical phone maintains full ownership of WhatsApp Business. CRM acts as a <strong>Linked Device</strong>. Automated reminders send in the background and sync to your phone in real-time. Zero Meta message charges.
          </p>
        </div>
      </div>

      {/* Gateway Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          Loading WhatsApp Gateway Accounts...
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">No WhatsApp Gateway Accounts Found</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">Click below to add your first WhatsApp Gateway account.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Gateway Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const isConnected = session.status === 'CONNECTED';
            const isScanQr = session.status === 'SCAN_QR';
            const isConnecting = session.status === 'CONNECTING';

            return (
              <div
                key={session.id}
                className={`bg-white rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  session.is_default ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-base">{session.session_name}</h3>
                      {session.is_default && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Key: {session.brand_key}</p>
                  </div>

                  {/* Status Badge */}
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Connected
                    </span>
                  ) : isScanQr ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-full border border-amber-200">
                      <QrCode className="w-3.5 h-3.5" /> Scan QR
                    </span>
                  ) : isConnecting ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-100 rounded-full border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" /> Disconnected
                    </span>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-5 space-y-3.5 flex-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">
                      {session.phone_number ? `+${session.phone_number}` : 'Not Paired Yet'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Company: <strong className="text-slate-700">{session.company?.name ?? 'Global (All Companies)'}</strong>
                    </span>
                  </div>

                  {session.connected_at && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Paired: {new Date(session.connected_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  {session.error_message && !isConnected && (
                    <div className="text-xs bg-rose-50 text-rose-700 p-2.5 rounded-lg border border-rose-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{session.error_message}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
                  {!isConnected ? (
                    <button
                      onClick={() => {
                        if (session.qr_code_base64 && isScanQr) {
                          setActiveQrSession(session);
                        } else {
                          connectMutation.mutate(session.id);
                        }
                      }}
                      disabled={connectMutation.isPending}
                      className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow"
                    >
                      <QrCode className="w-4 h-4" />
                      {isScanQr ? 'Show QR Code to Pair' : 'Generate QR Code'}
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => setShowTestModal(session)}
                          className="flex-1 py-1.5 px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" /> Test Send
                        </button>

                        {!session.is_default && (
                          <button
                            onClick={() => setDefaultMutation.mutate(session.id)}
                            className="py-1.5 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1"
                            title="Set as global default gateway"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500" /> Set Default
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (confirm(`Disconnect session "${session.session_name}"?`)) {
                              disconnectMutation.mutate(session.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Disconnect / Logout"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add New Gateway Account */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" /> Add New WhatsApp Gateway
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Session Display Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Support Gateway"
                  value={newSession.session_name}
                  onChange={(e) => setNewSession({ ...newSession, session_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unique Brand Key *
                </label>
                <input
                  type="text"
                  placeholder="e.g. PRIMARY_GATEWAY"
                  value={newSession.brand_key}
                  onChange={(e) => setNewSession({ ...newSession, brand_key: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Unique uppercase code for routing (e.g. PRIMARY_GATEWAY)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={newSession.phone_number}
                  onChange={(e) => setNewSession({ ...newSession, phone_number: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Link to CRM Company
                </label>
                <select
                  value={newSession.company_id}
                  onChange={(e) => setNewSession({ ...newSession, company_id: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Global Fallback (All Companies)</option>
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={newSession.is_default}
                  onChange={(e) => setNewSession({ ...newSession, is_default: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="is_default" className="text-sm font-medium text-slate-700">
                  Set as default global gateway
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow"
                >
                  Create Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QR Code Pairing */}
      {activeQrSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-center animate-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-lg">Pair WhatsApp Business App</h3>
                <p className="text-xs text-slate-500">{activeQrSession.session_name}</p>
              </div>
              <button
                onClick={() => setActiveQrSession(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeQrSession.status === 'CONNECTED' ? (
              <div className="py-8 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-xl font-bold text-slate-800">Successfully Connected!</h4>
                <p className="text-slate-600 text-sm">
                  WhatsApp Business phone number <strong>+{activeQrSession.phone_number}</strong> is paired as a Linked Device.
                </p>
                <button
                  onClick={() => setActiveQrSession(null)}
                  className="mt-4 px-6 py-2.5 font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow"
                >
                  Done
                </button>
              </div>
            ) : activeQrSession.qr_code_base64 ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block shadow-inner">
                  <img
                    src={activeQrSession.qr_code_base64}
                    alt="WhatsApp Pairing QR Code"
                    className="w-64 h-64 mx-auto rounded-lg"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left text-xs text-amber-900 space-y-1.5">
                  <p className="font-bold text-amber-950 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-amber-600" /> Pairing Instructions:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-900 font-medium">
                    <li>Open <strong>WhatsApp Business App</strong> on your phone.</li>
                    <li>Tap <strong>3 Dots (Menu)</strong> → <strong>Linked Devices</strong>.</li>
                    <li>Tap <strong>Link a Device</strong> & scan this QR Code.</li>
                  </ol>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  Auto-checking status... Scan now!
                </div>
              </div>
            ) : (
              <div className="py-12 space-y-3 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                <p className="text-sm font-medium">Connecting to WhatsApp Web socket...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Test Send Message */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" /> Send Test WhatsApp Message
              </h3>
              <button onClick={() => setShowTestModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Recipient Mobile Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={testForm.phone_number}
                  onChange={(e) => setTestForm({ ...testForm, phone_number: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Message Content *
                </label>
                <textarea
                  rows={4}
                  value={testForm.message}
                  onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTestModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendTestMutation.isPending}
                  className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
