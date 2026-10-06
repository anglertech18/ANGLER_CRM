import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, RefreshCw, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import clsx from 'clsx';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Unread count — poll every 60s, only when tab is active
  const { data: countData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    retry: false,
  });

  // Notification list — only fetch when open
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=15').then(r => r.data),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/mark-all-read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const unread = countData?.unread_count ?? 0;
  const notifications: any[] = notifData?.data ?? [];

  const handleClick = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const TYPE_COLOR: Record<string, string> = {
    RENEWAL_REMINDER:   'bg-blue-500',
    RENEWAL_EXPIRY:     'bg-red-500',
    RENEWAL_ESCALATION: 'bg-orange-500',
    RENEWAL_OVERDUE:    'bg-red-600',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          open ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
        )}
        title="Notifications"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-modal border border-slate-200 z-50 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button onClick={() => qc.invalidateQueries({ queryKey: ['notifications'] })} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="skeleton w-2 h-full rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton h-2.5 w-2/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={clsx(
                    'w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3',
                    !n.is_read && 'bg-blue-50/40'
                  )}
                >
                  <div className={clsx('w-1.5 rounded-full shrink-0 mt-1', TYPE_COLOR[n.type] ?? 'bg-slate-300')} style={{ minHeight: '36px' }} />
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-xs leading-snug', n.is_read ? 'text-slate-600' : 'text-slate-800 font-semibold')}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{n.body}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{dayjs(n.created_at).fromNow()}</p>
                  </div>
                  {n.link && <ExternalLink size={11} className="text-slate-300 shrink-0 mt-1" />}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 text-center">
              <button
                onClick={() => { setOpen(false); navigate('/renewals/follow-ups'); }}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium"
              >
                View follow-up queue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
