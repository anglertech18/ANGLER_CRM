import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  useFloating, offset, flip, shift, autoUpdate,
} from '@floating-ui/react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Mail, Phone, Calendar, DollarSign } from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../services/api';
import clsx from 'clsx';

interface Props {
  instanceId: number;
  referenceEl: HTMLElement | null;
  isOpen: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onOpenDetail?: () => void;
}

const CHANNEL_ICON: Record<string, string> = {
  EMAIL_DRAFT: '✉',
  EMAIL_DIRECT: '✉',
  CALL_TASK: '☎',
};

const STATUS_COLOR: Record<string, string> = {
  DUE_SOON:  'text-amber-600 bg-amber-50',
  OVERDUE:   'text-red-600 bg-red-50',
  ACTIVE:    'text-emerald-600 bg-emerald-50',
  EXPIRED:   'text-red-700 bg-red-100',
  RENEWED:   'text-blue-600 bg-blue-50',
  DEFAULT:   'text-slate-600 bg-slate-100',
};

export function MappingHoverCard({
  instanceId,
  referenceEl,
  isOpen,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onOpenDetail,
}: Props) {
  const navigate = useNavigate();

  const { refs, floatingStyles } = useFloating({
    placement: 'right-start',
    middleware: [offset(10), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference(referenceEl);
  }, [referenceEl, refs]);

  const { data, isLoading } = useQuery({
    queryKey: ['mapping-hover', instanceId],
    queryFn: () => api.get(`/renewal-pricing/mappings/${instanceId}/hover`).then(r => r.data.data),
    enabled: isOpen && !!instanceId,
    staleTime: 30_000,
  });

  if (!isOpen) return null;

  const daysRemaining = data?.expiry_date
    ? dayjs(data.expiry_date).diff(dayjs(), 'day')
    : null;

  const statusKey = data?.status ?? 'DEFAULT';
  const statusClass = STATUS_COLOR[statusKey] ?? STATUS_COLOR.DEFAULT;

  return createPortal(
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, zIndex: 9999 }}
      className="w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave || onClose}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-800 truncate">
            {isLoading ? '...' : data?.renewal_account?.client_company?.name}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {data?.service_master?.name} · {data?.service_master?.category?.name}
          </p>
        </div>
        <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', statusClass)}>
          {statusKey.replace('_', ' ')}
        </span>
      </div>

      {isLoading ? (
        <div className="px-4 py-6 flex justify-center">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Key Fields */}
          <div className="px-4 py-3 space-y-2 border-b border-slate-100">
            {data?.identifier && (
              <div className="flex items-center gap-2 text-[12px] min-w-0">
                <span className="text-slate-400 w-4 shrink-0">🌐</span>
                <span className="text-slate-700 font-medium truncate min-w-0" title={data.identifier}>{data.identifier}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[12px] min-w-0">
              <DollarSign size={12} className="text-slate-400 shrink-0" />
              <span className="text-slate-700 truncate min-w-0">
                {data?.resolved_price
                  ? `₹${Number(data.resolved_price.price).toLocaleString('en-IN')}/${data.resolved_price.billing_unit}`
                  : `₹${Number(data?.amount_due ?? 0).toLocaleString('en-IN')}`}
              </span>
              {data?.resolved_price?.source === 'customer_override' && (
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">override</span>
              )}
            </div>
            {data?.expiry_date && (
              <div className="flex items-center gap-2 text-[12px]">
                <Calendar size={12} className="text-slate-400" />
                <span className="text-slate-700">{dayjs(data.expiry_date).format('DD MMM YYYY')}</span>
                <span className={clsx(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded',
                  daysRemaining !== null && daysRemaining < 0 ? 'text-red-600 bg-red-50'
                    : daysRemaining !== null && daysRemaining <= 15 ? 'text-amber-600 bg-amber-50'
                    : 'text-slate-500 bg-slate-100',
                )}>
                  {daysRemaining !== null ? `${Math.abs(daysRemaining)}d ${daysRemaining < 0 ? 'overdue' : 'left'}` : ''}
                </span>
              </div>
            )}
            {data?.service_master?.category?.code === 'EMAIL' && data?.email_count !== null && data?.email_count !== undefined && (
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-slate-400 shrink-0">👥</span>
                <span className="text-slate-700 font-semibold">{data.email_count} Users/IDs</span>
              </div>
            )}
            {(data?.service_master?.category?.code === 'AMC' || data?.service_master?.category?.code === 'SUPPORT') && data?.provider_type && (
              <div className="flex items-start gap-2 text-[12px] min-w-0">
                <span className="text-slate-400 shrink-0 mt-0.5">🖥️</span>
                <div className="min-w-0 flex-1">
                  <span className="text-slate-700 font-semibold">
                    {data.provider_type === 'CLIENT_SERVER' ? "Client's Server" : "Angler's Server"}
                  </span>
                  {data.provider_type === 'ANGLER_SERVER' && data.server_name && (
                    <span className="text-slate-500 font-mono text-[10px] block mt-0.5 truncate" title={data.server_name}>
                      [{data.server_name}]
                    </span>
                  )}
                </div>
              </div>
            )}
            {data?.customer_contact && (
              <div className="flex items-center gap-2 text-[12px] min-w-0">
                <Mail size={12} className="text-slate-400 shrink-0" />
                <span className="text-slate-600 truncate min-w-0" title={data.customer_contact.email ?? data.customer_contact.name}>{data.customer_contact.email ?? data.customer_contact.name}</span>
              </div>
            )}
          </div>

          {/* Alert Steps */}
          {data?.alert_steps?.length > 0 && (
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Alert Timeline</p>
              <div className="space-y-1">
                {data.alert_steps.slice(0, 4).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400">{CHANNEL_ICON[s.channel] ?? '●'}</span>
                    <span className="text-slate-600">{s.days_before}d before</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{s.channel.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="px-4 py-2.5 flex gap-2">
            <button
              className="flex-1 text-[11px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg px-2 py-1.5 transition-colors text-center"
              onClick={() => {
                if (onOpenDetail) {
                  onOpenDetail();
                } else {
                  navigate(`/renewals/mappings/${instanceId}`);
                }
              }}
            >
              Open Detail
            </button>
            <button
              className="flex-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors text-center"
              onClick={() => {
                navigate(`/renewals/mappings/${instanceId}?action=followup`);
              }}
            >
              Log Follow-up
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
