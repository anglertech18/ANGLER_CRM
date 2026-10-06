import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Globe, Info } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';

interface Props {
  index: number;
  service: any;
  categories: any[];
  subCategories: any[];
  serviceMasters: any[];
  providers: any[];
  users: any[];
  contacts: any[];
  policies: any[];
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onCategoryChange: (index: number, categoryId: string) => void;
  onSubCategoryChange: (index: number, subCategoryId: string) => void;
}

export function ServiceCard({
  index, service, categories, subCategories, serviceMasters, providers,
  users, contacts, policies, onChange, onRemove, onCategoryChange, onSubCategoryChange,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const filteredSubCategories = subCategories.filter(
    (sc: any) => !service.category_id || String(sc.parent_id) === String(service.category_id)
  );

  const filteredMasters = serviceMasters.filter(
    (s: any) => !service.sub_category_id || String(s.sub_category_id) === String(service.sub_category_id)
  );

  const selectedMaster = serviceMasters.find((s: any) => String(s.id) === String(service.service_master_id));
  const subCat = subCategories.find((c: any) => String(c.id) === String(service.sub_category_id));
  const cat = subCat || categories.find((c: any) => String(c.id) === String(service.category_id));

  const f = (field: string, val: any) => onChange(index, field, val);

  const calcExpiry = (startDate: string, val: number, unit: string) => {
    if (!startDate) return '';
    const d = dayjs(startDate);
    if (!d.isValid()) return '';
    let end = d;
    if (unit === 'days') end = d.add(val || 1, 'day');
    else if (unit === 'years') end = d.add(val || 1, 'year');
    else end = d.add(val || 12, 'month');
    return end.subtract(1, 'day').format('YYYY-MM-DD');
  };

  const handleActivationDateChange = (dateVal: string) => {
    f('activation_date', dateVal);
    const calculatedExpiry = calcExpiry(dateVal, service.duration_value ?? 12, service.duration_unit ?? 'months');
    if (calculatedExpiry) {
      f('expiry_date', calculatedExpiry);
    }
  };

  const handleDurationValueChange = (val: number) => {
    f('duration_value', val);
    if (service.activation_date) {
      const calculatedExpiry = calcExpiry(service.activation_date, val, service.duration_unit ?? 'months');
      if (calculatedExpiry) f('expiry_date', calculatedExpiry);
    }
  };

  const handleDurationUnitChange = (unit: string) => {
    f('duration_unit', unit);
    if (service.activation_date) {
      const calculatedExpiry = calcExpiry(service.activation_date, service.duration_value ?? 12, unit);
      if (calculatedExpiry) f('expiry_date', calculatedExpiry);
    }
  };

  return (
    <div className={clsx('border rounded-xl overflow-hidden transition-all', expanded ? 'border-slate-200' : 'border-slate-100')}>
      {/* Card header */}
      <div
        className={clsx('flex items-center justify-between px-4 py-3 cursor-pointer select-none', expanded ? 'bg-slate-50 border-b border-slate-200' : 'bg-white')}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: subCat?.color ?? cat?.color ?? '#6366F1' }}>
            {index + 1}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {selectedMaster?.name ?? subCat?.name ?? cat?.name ?? `Service ${index + 1}`}
            </p>
            {service.identifier && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Globe size={10} />{service.identifier}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(index); }}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {/* Card body */}
      {expanded && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 1 */}
          <div className="form-group">
            <label className="form-label">Service Category <span className="text-red-500">*</span></label>
            <select value={service.category_id ?? ''} onChange={e => onCategoryChange(index, e.target.value)} className="form-select">
              <option value="">Select category...</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subcategory <span className="text-red-500">*</span></label>
            <select value={service.sub_category_id ?? ''} onChange={e => onSubCategoryChange(index, e.target.value)} className="form-select" disabled={!service.category_id}>
              <option value="">Select subcategory...</option>
              {filteredSubCategories.map((sc: any) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Service Plan <span className="text-red-500">*</span></label>
            <select value={service.service_master_id ?? ''} onChange={e => f('service_master_id', e.target.value)} className="form-select" disabled={!service.sub_category_id}>
              <option value="">Select service...</option>
              {filteredMasters.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{selectedMaster?.identifier_label ?? 'Identifier'}</label>
            <input type="text" value={service.identifier ?? ''} onChange={e => f('identifier', e.target.value)}
              placeholder={selectedMaster?.identifier_label ?? 'e.g. abc.com'}
              className="form-input" />
          </div>

          {/* Row 2 */}
          <div className="form-group">
            <label className="form-label">Provider</label>
            <select value={service.provider_id ?? ''} onChange={e => f('provider_id', e.target.value)} className="form-select">
              <option value="">Select provider...</option>
              {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Start Date (Activation)</label>
            <input type="date" value={service.activation_date ? dayjs(service.activation_date).format('YYYY-MM-DD') : ''}
              onChange={e => handleActivationDateChange(e.target.value)} className="form-input"
              onClick={(e: any) => e.target.showPicker?.()} />
          </div>

          <div className="form-group">
            <div className="flex items-center justify-between">
              <label className="form-label">Expiry Date <span className="text-red-500">*</span></label>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 font-medium px-1.5 py-0.5 rounded border border-emerald-200">Auto-calculated</span>
            </div>
            <input type="date" value={service.expiry_date ? dayjs(service.expiry_date).format('YYYY-MM-DD') : ''}
              readOnly disabled className="form-input bg-slate-100 text-slate-700 cursor-not-allowed font-medium" />
          </div>

          {(subCat?.code === 'EMAIL' || cat?.code === 'EMAIL') && (
            <div className="form-group md:col-span-3">
              <label className="form-label">Email IDs Count</label>
              <input type="number" value={service.email_count ?? ''} onChange={e => f('email_count', parseInt(e.target.value))}
                placeholder="Number of email IDs" className="form-input" min={1} />
            </div>
          )}

          {/* Row 3 */}
          <div className="form-group">
            <label className="form-label">Duration</label>
            <div className="flex gap-2">
              <input type="number" value={service.duration_value ?? 12} onChange={e => handleDurationValueChange(parseInt(e.target.value))}
                className="form-input w-24" min={1} />
              <select value={service.duration_unit ?? 'months'} onChange={e => handleDurationUnitChange(e.target.value)} className="form-select flex-1">
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Amount Due (₹) <span className="text-red-500">*</span></label>
            <input type="number" value={service.amount_due ?? ''} onChange={e => f('amount_due', e.target.value)}
              placeholder="0.00" className="form-input" min={0} step={0.01} />
          </div>

          {selectedMaster?.supports_amc && selectedMaster?.name !== 'Budget Starter Server' && (
            <div className="form-group">
              <label className="form-label">AMC Amount (₹)</label>
              <input type="number" value={service.amc_amount ?? ''} onChange={e => f('amc_amount', e.target.value)}
                placeholder="0.00" className="form-input" min={0} step={0.01} />
            </div>
          )}

          {/* Row 4 */}
          <div className="form-group">
            <label className="form-label">Assigned User</label>
            <select value={service.assigned_user_id ?? ''} onChange={e => f('assigned_user_id', e.target.value)} className="form-select">
              <option value="">Select user...</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Customer Contact</label>
            <select value={service.customer_contact_id ?? ''} onChange={e => f('customer_contact_id', e.target.value)} className="form-select">
              <option value="">Select contact...</option>
              {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.designation ? `(${c.designation})` : ''}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Reminder Policy</label>
            <select value={service.reminder_policy_id ?? ''} onChange={e => f('reminder_policy_id', e.target.value)} className="form-select">
              <option value="">Use default policy</option>
              {policies.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Row 4b — Provider Type (Website AMC / Support Package only) */}
          {(selectedMaster?.name === 'Website AMC' || subCat?.code === 'SUPPORT' || cat?.code === 'SUPPORT') && (
            <div className="form-group">
              <label className="form-label">Provider Type</label>
              <select value={service.provider_type ?? ''} onChange={e => f('provider_type', e.target.value)} className="form-select">
                <option value="">Select type...</option>
                <option value="CLIENT_SERVER">Client Server</option>
                <option value="ANGLER_SERVER">Angler Server</option>
              </select>
            </div>
          )}
          {service.provider_type === 'ANGLER_SERVER' && (
            <div className="form-group">
              <label className="form-label">Server Name</label>
              <input type="text" value={service.server_name ?? ''} onChange={e => f('server_name', e.target.value)}
                placeholder="Server name" className="form-input" />
            </div>
          )}

          {/* Row 5 */}
          <div className="form-group">
            <label className="form-label">Status <span className="inline-block relative group" title="Active=Running, Due Soon=Expiring in 30 days, Follow Up=Needs attention, Renewed=Completed, Not Renewing=Client declined"><Info size={12} className="text-slate-400 cursor-help inline" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">Active → Running normally<br/>Due Soon → Expiring within 30 days<br/>Follow Up → Needs attention<br/>Renewed → Already renewed<br/>Not Renewing → Client declined</span>
            </span></label>
            <select value={service.status ?? 'ACTIVE'} onChange={e => f('status', e.target.value)} className="form-select">
              <option value="ACTIVE">Active</option>
              <option value="DUE_SOON">Due Soon</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="RENEWED">Renewed</option>
              <option value="NOT_RENEWING">Not Renewing</option>
            </select>
          </div>

          <div className="form-group md:col-span-2">
            <label className="form-label">Remarks</label>
            <input type="text" value={service.remarks ?? ''} onChange={e => f('remarks', e.target.value)}
              placeholder="Optional notes about this service..." className="form-input" />
          </div>
        </div>
      )}
    </div>
  );
}
