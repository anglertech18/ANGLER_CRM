import { useState } from 'react';
import { GripVertical, Plus, X, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface AlertStep {
  step_number: number;
  days_before: number;
  channel: 'EMAIL_DRAFT' | 'EMAIL_DIRECT' | 'CALL_TASK';
  email_template_id: number | null;
  attach_order_form?: boolean;
}

interface Template { id: number; name: string; }

interface Props {
  steps: AlertStep[];
  templates?: Template[];
  onChange: (steps: AlertStep[]) => void;
  readonly?: boolean;
}

const CHANNEL_OPTIONS = [
  { value: 'EMAIL_DRAFT',   label: 'Email (Draft — approval required)' },
  { value: 'EMAIL_DIRECT',  label: 'Email (Direct send)' },
  { value: 'CALL_TASK',     label: 'Call Task' },
];

const CHANNEL_BADGE: Record<string, string> = {
  EMAIL_DRAFT:  'bg-indigo-50 text-indigo-700',
  EMAIL_DIRECT: 'bg-sky-50 text-sky-700',
  CALL_TASK:    'bg-amber-50 text-amber-700',
};

const CHANNEL_ICON: Record<string, string> = {
  EMAIL_DRAFT:  '✉',
  EMAIL_DIRECT: '✉',
  CALL_TASK:    '☎',
};

export function AlertTimelineBuilder({ steps, templates = [], onChange, readonly = false }: Props) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const renumber = (arr: AlertStep[]) =>
    arr.map((s, i) => ({ ...s, step_number: i + 1 }));

  const addStep = () => {
    const last = steps[steps.length - 1];
    const newDays = last ? Math.max(1, last.days_before - 7) : 30;
    onChange(renumber([...steps, { step_number: steps.length + 1, days_before: newDays, channel: 'EMAIL_DRAFT', email_template_id: null, attach_order_form: true }]));
  };

  const removeStep = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx);
    onChange(renumber(next));
  };

  const updateStep = (idx: number, patch: Partial<AlertStep>) => {
    const next = steps.map((s, i) => i === idx ? { ...s, ...patch } : s);
    onChange(renumber(next));
  };

  // Drag-to-reorder
  const onDragStart = (idx: number) => setDragging(idx);
  const onDragEnter = (idx: number) => setDragOver(idx);
  const onDragEnd = () => {
    if (dragging === null || dragOver === null || dragging === dragOver) {
      setDragging(null); setDragOver(null); return;
    }
    const next = [...steps];
    const [moved] = next.splice(dragging, 1);
    next.splice(dragOver, 0, moved);
    onChange(renumber(next));
    setDragging(null); setDragOver(null);
  };

  return (
    <div className="space-y-2">
      {steps.length === 0 && (
        <p className="text-[12px] text-slate-400 italic py-2">
          No custom steps — using global reminder policy as fallback.
        </p>
      )}

      {steps.map((step, idx) => (
        <div
          key={step.step_number}
          draggable={!readonly}
          onDragStart={() => onDragStart(idx)}
          onDragEnter={() => onDragEnter(idx)}
          onDragEnd={onDragEnd}
          onDragOver={e => e.preventDefault()}
          className={clsx(
            'flex items-center gap-2 bg-white border rounded-lg px-3 py-2 transition-all',
            dragOver === idx ? 'border-primary-400 shadow-md' : 'border-slate-200',
            dragging === idx ? 'opacity-40' : 'opacity-100',
          )}
        >
          {!readonly && (
            <GripVertical size={14} className="text-slate-300 cursor-grab flex-shrink-0" />
          )}

          {/* Days input */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <input
              type="number"
              min={1}
              max={365}
              value={step.days_before}
              disabled={readonly}
              onChange={e => updateStep(idx, { days_before: parseInt(e.target.value) || 1 })}
              className="w-14 text-center text-[13px] font-semibold border border-slate-200 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-50"
            />
            <span className="text-[11px] text-slate-500 whitespace-nowrap">days before</span>
          </div>

          <span className="text-slate-300">→</span>

          {/* Channel selector */}
          <div className="relative flex-shrink-0">
            <select
              value={step.channel}
              disabled={readonly}
              onChange={e => updateStep(idx, { channel: e.target.value as AlertStep['channel'], email_template_id: null })}
              className="appearance-none pl-6 pr-7 py-1 text-[12px] font-medium border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-50 cursor-pointer"
            >
              {CHANNEL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none">
              {CHANNEL_ICON[step.channel]}
            </span>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Template selector — only for email channels */}
          {step.channel !== 'CALL_TASK' && templates.length > 0 && (
            <select
              value={step.email_template_id ?? ''}
              disabled={readonly}
              onChange={e => updateStep(idx, { email_template_id: e.target.value ? parseInt(e.target.value) : null })}
              className="flex-1 min-w-0 appearance-none px-2 py-1 text-[11px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-slate-50 cursor-pointer truncate"
            >
              <option value="">— Select template —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {/* 📄 Attach Order Form toggle — only for email steps */}
          {step.channel !== 'CALL_TASK' && (
            <button
              type="button"
              disabled={readonly}
              title={`Order Form PDF: ${(step.attach_order_form ?? true) ? 'Will attach to this email' : 'Not attached'}`}
              onClick={() => !readonly && updateStep(idx, { attach_order_form: !(step.attach_order_form ?? true) })}
              className={clsx(
                'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 transition-all',
                (step.attach_order_form ?? true)
                  ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100',
                readonly && 'cursor-default opacity-70'
              )}
            >
              📄 {(step.attach_order_form ?? true) ? 'PDF ✓' : 'PDF ✗'}
            </button>
          )}

          {/* Badge */}
          <span className={clsx('text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0', CHANNEL_BADGE[step.channel])}>
            {step.channel === 'EMAIL_DRAFT' ? 'Approval' : step.channel === 'EMAIL_DIRECT' ? 'Auto-send' : 'Task'}
          </span>

          {!readonly && (
            <button
              onClick={() => removeStep(idx)}
              className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}

      {!readonly && (
        <button
          onClick={addStep}
          className="flex items-center gap-1.5 text-[12px] text-primary-600 hover:text-primary-700 font-medium py-1.5 px-2 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <Plus size={14} /> Add Alert Step
        </button>
      )}

      {steps.length > 0 && (
        <p className="text-[10px] text-slate-400 pt-1">
          Drag to reorder · 📄 PDF toggle attaches Order Form to that email step · Steps execute top to bottom
        </p>
      )}
    </div>
  );
}
