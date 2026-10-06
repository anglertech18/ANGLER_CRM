import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, CheckCircle2, Plus, Trash2, Edit, X,
  Clock, Building, DollarSign, Bell, Tag, UserPlus,
  ChevronDown, ChevronUp, Layers, UserCheck, RefreshCw, ArrowRight, ArrowLeft,
  ExternalLink, FileText, AlertTriangle, ShieldCheck
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api, { formatApiError } from '../../services/api';

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d: string) => d ? dayjs(d).format('DD MMM YYYY') : '—';

const normalizeCategoryCode = (category?: any) => {
  const code = String(category?.code || '').toUpperCase();
  const name = String(category?.name || '').toUpperCase();
  if (code.includes('DOMAIN') || name.includes('DOMAIN')) return 'DOMAIN';
  if (code.includes('SERVER') || name.includes('HOSTING')) return 'SERVER';
  if (code.includes('EMAIL') || name.includes('EMAIL')) return 'EMAIL';
  if (code.includes('SSL') || name.includes('SSL')) return 'SSL';
  if (code.includes('AMC') || name.includes('MAINTENANCE')) return 'AMC';
  if (code.includes('SUPPORT') || name.includes('SUPPORT') || name.includes('SECURITY')) return 'SUPPORT';
  return code;
};

const RECIPIENT_OPTIONS = [
  { value: 'ALL', label: 'All Company Contacts' },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface FollowupStep {
  id: number;
  offset_days: number;
  action_type?: string;
  channel: string;
  recipient_type: string;
  attach_order_form?: boolean;
}

interface ServiceLine {
  id: number;
  category_name: string;
  sub_category_name: string;
  service_name: string;
  identifier_label: string;
  service_master_id: number | null;
  identifier: string;
  provider_id: number | null;
  provider_name: string;
  server_name: string;
  plan_name: string;
  quantity: number;
  activation_date: string;
  expiry_date: string;
  duration: number;
  duration_unit: string;
  amount_due: number;
  reminder_policy_id: number | null;
  policy_name: string;
  followup_steps: FollowupStep[];
  customer_contact_id: number | null;
}

// ─── Clean Type-to-Filter Searchable Dropdown Component ───────────────────────
function SearchableSelect({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  subLabel,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  options: Array<{ value: string; label: string; detail?: string }>;
  placeholder: string;
  disabled?: boolean;
  subLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOpt = options.find(o => String(o.value) === String(value));

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o =>
      o.label?.toLowerCase().includes(q) || o.detail?.toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[11px] font-bold text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Trigger Button - Clean Layout without icon bloat */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setIsOpen(prev => !prev); setSearch(''); } }}
        className={clsx(
          'w-full text-xs font-semibold rounded-xl border px-3.5 py-2.5 flex items-center justify-between transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-left',
          disabled ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
          value ? 'border-blue-500 bg-white text-slate-900 shadow-blue-50/50' : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400'
        )}
      >
        <span className="truncate pr-2">
          {selectedOpt ? (
            <span className="font-bold text-slate-800">
              {selectedOpt.label} {selectedOpt.detail ? <span className="text-slate-400 font-normal text-[10px]">({selectedOpt.detail})</span> : ''}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={14} className={clsx('text-slate-400 shrink-0 transition-transform duration-200', isOpen && 'rotate-180 text-blue-600')} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-1.5 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-2 min-w-[200px] animate-in fade-in zoom-in-95">
          {/* Type-to-filter Search Input */}
          <div className="relative mb-2">
            <input
              type="text"
              autoFocus
              placeholder="Type to filter options..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-3">No matching options</p>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      'w-full text-left text-xs px-3 py-2 rounded-xl transition-all flex items-center justify-between',
                      isSelected ? 'bg-blue-600 text-white font-bold shadow-sm' : 'hover:bg-blue-50 text-slate-700 font-semibold'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate">{opt.label}</p>
                      {opt.detail && (
                        <p className={clsx('text-[10px] truncate', isSelected ? 'text-blue-100' : 'text-slate-400')}>
                          {opt.detail}
                        </p>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 size={13} className="shrink-0 ml-2 text-white" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {subLabel && <p className="text-[10px] text-emerald-600 font-semibold mt-1">{subLabel}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RenewalForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  // ── Edit Account Data Loader ──────────────────────────────────────────────
  const { data: editAccount, isLoading: loadingEditAccount } = useQuery({
    queryKey: ['renewal', id],
    queryFn:  () => api.get(`/renewals/${id}`).then(r => r.data),
    enabled:  !!id,
  });

  // ── Wizard State ──────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);

  // ── Stage 1: Company Hierarchy & Ownership ───────────────────────────────
  const [companyMasterId, setCompanyMasterId] = useState('');
  const [clientCompanyId, setClientCompanyId] = useState('');
  const [clientNameInput, setClientNameInput] = useState('');
  const [managerId, setManagerId] = useState('');
  const [executiveId, setExecutiveId] = useState('');

  // ── Stage 2: Company Contacts & Services ──────────────────────────────────
  const [companyContactIds, setCompanyContactIds] = useState<string[]>([]);
  const [addedServices, setAddedServices] = useState<ServiceLine[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(true);

  // Pre-populate fields when editing existing account
  useEffect(() => {
    if (!editAccount) return;
    
    const compId = editAccount.company_id || editAccount.company?.id || editAccount.company_master_id;
    if (compId) setCompanyMasterId(String(compId));

    const clientCompId = editAccount.client_company_id || editAccount.client_company?.id;
    if (clientCompId) setClientCompanyId(String(clientCompId));

    if (editAccount.client_company?.name || editAccount.account_name) {
      setClientNameInput(editAccount.client_company?.name || editAccount.account_name || '');
    }

    const mgrId = editAccount.account_manager_id || editAccount.account_manager?.id;
    if (mgrId) setManagerId(String(mgrId));

    const execId = editAccount.renewal_executive_id || editAccount.assigned_executive_id || editAccount.renewal_executive?.id;
    if (execId) setExecutiveId(String(execId));

    if (Array.isArray(editAccount.contacts) && editAccount.contacts.length > 0) {
      setCompanyContactIds(editAccount.contacts.map((c: any) => String(c.contact_id || c.id || c.contact?.id)));
    }

    if (Array.isArray(editAccount.services) && editAccount.services.length > 0) {
      const mappedServices: ServiceLine[] = editAccount.services.map((svc: any) => ({
        id: svc.id,
        category_name: svc.service_master?.category?.name || 'General',
        sub_category_name: svc.service_master?.sub_category?.name || '',
        service_name: svc.service_master?.name || svc.identifier || 'Service',
        identifier_label: svc.service_master?.identifier_label || 'Identifier',
        service_master_id: svc.service_master_id || (svc.service_master?.id ?? null),
        identifier: svc.identifier || '',
        provider_id: svc.provider_id || (svc.provider?.id ?? null),
        provider_name: svc.provider?.name || '—',
        server_name: svc.server_name || '',
        plan_name: svc.plan_name || '',
        quantity: svc.quantity || svc.email_count || 1,
        activation_date: svc.activation_date ? dayjs(svc.activation_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        expiry_date: svc.expiry_date ? dayjs(svc.expiry_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        duration: svc.duration_value || svc.duration || 12,
        duration_unit: svc.duration_unit || 'Months',
        amount_due: svc.cycles?.[0]?.amount_due ?? (svc.amount_due || 0),
        reminder_policy_id: svc.reminder_policy_id || null,
        policy_name: svc.reminder_policy?.name || 'Custom Schedule',
        customer_contact_id: svc.customer_contact_id || null,
        followup_steps: (svc.reminder_policy?.steps || svc.followup_steps || []).map((st: any) => ({
          id: st.id,
          offset_days: st.offset_days,
          action_type: st.action_type || (st.channel?.includes('CALL') ? 'CALL_TASK' : 'EMAIL_DIRECT'),
          channel: st.channel ?? 'Email',
          recipient_type: st.recipient_type || 'ALL',
        })),
      }));
      setAddedServices(mappedServices);
      setShowServiceForm(false);
    }
  }, [editAccount]);

  // Service Form Cascading Master Fields
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [serviceMasterId, setServiceMasterId] = useState('');
  const [identifierLabel, setIdentifierLabel] = useState('Domain / Server Name');
  const [identifier, setIdentifier] = useState('');
  const [providerId, setProviderId] = useState('');
  const [serverSubName, setServerSubName] = useState('');
  const [planName, setPlanName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [activationDate, setActivationDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [duration, setDuration] = useState('12');
  const [durationUnit, setDurationUnit] = useState('Months');
  const [amountDue, setAmountDue] = useState('0');
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [requiresIdentifier, setRequiresIdentifier] = useState(true);

  const [policyId, setPolicyId] = useState('');
  const [serviceContactId, setServiceContactId] = useState<string>('');
  const [followupSteps, setFollowupSteps] = useState<FollowupStep[]>([]);

  // Modals State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactDesignation, setNewContactDesignation] = useState('');

  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  // Financial Live Preview State
  const [gstRate, setGstRate] = useState<number>(18);
  const [isEditingGst, setIsEditingGst] = useState<boolean>(false);

  // Right panel collapsed state
  const [panelCollapsed, setPanelCollapsed] = useState<Record<number, boolean>>({});

  // ── API: Company Masters (Group Companies) ────────────────────────────────
  const { data: rawCompanyMasters } = useQuery({
    queryKey: ['masters', 'company'],
    queryFn: () => api.get('/masters/company').then(r => r.data),
  });
  const companyMasters: any[] = useMemo(() =>
    Array.isArray(rawCompanyMasters) ? rawCompanyMasters : (Array.isArray(rawCompanyMasters?.data) ? rawCompanyMasters.data : []),
    [rawCompanyMasters]
  );
  const selectedCompanyMasterObj = useMemo(() =>
    companyMasters.find(c => String(c.id) === companyMasterId),
    [companyMasters, companyMasterId]
  );

  // ── API: Client Companies ─────────────────────────────────────────────────
  const { data: rawClientCompanies, refetch: refetchClientCompanies } = useQuery({
    queryKey: ['masters', 'clientcompany'],
    queryFn: () => api.get('/masters/clientcompany').then(r => r.data),
  });
  const clientCompanies: any[] = useMemo(() =>
    Array.isArray(rawClientCompanies) ? rawClientCompanies : (Array.isArray(rawClientCompanies?.data) ? rawClientCompanies.data : []),
    [rawClientCompanies]
  );
  const selectedClientCompanyObj = useMemo(() =>
    clientCompanies.find(c => String(c.id) === clientCompanyId || c.name === clientNameInput),
    [clientCompanies, clientCompanyId, clientNameInput]
  );

  // Helper to format user display name
  const getUserDisplayName = (u: any) => {
    if (!u) return '';
    if (u.name) return u.name;
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return name || u.email || `User #${u.id}`;
  };

  // ── API: Users ─────────────────────────────────────────────────────────────
  const { data: rawUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const allUsers: any[] = useMemo(() =>
    Array.isArray(rawUsers) ? rawUsers : (Array.isArray(rawUsers?.data) ? rawUsers.data : []),
    [rawUsers]
  );

  const managerOptions = useMemo(() => {
    if (allUsers.length === 0) return [];
    const list = allUsers.filter(u =>
      u.role === 'SalesManager' ||
      u.role === 'Manager' ||
      u.role === 'Admin' ||
      u.role === 'CEO' ||
      String(u.id) === String(managerId)
    );
    const targetList = list.length > 0 ? list : allUsers;
    return targetList.map((u: any) => ({
      value: String(u.id),
      label: getUserDisplayName(u),
      detail: `${u.email || ''} ${u.role ? `(${u.role})` : ''}`.trim(),
    }));
  }, [allUsers, managerId]);

  const executiveOptions = useMemo(() => {
    if (allUsers.length === 0) return [];
    const list = allUsers.filter(u =>
      u.role === 'SalesPerson' ||
      u.role === 'Executive' ||
      u.role === 'Admin' ||
      u.role === 'CEO' ||
      String(u.id) === String(executiveId)
    );
    const targetList = list.length > 0 ? list : allUsers;
    return targetList.map((u: any) => ({
      value: String(u.id),
      label: getUserDisplayName(u),
      detail: `${u.email || ''} ${u.role ? `(${u.role})` : ''}`.trim(),
    }));
  }, [allUsers, executiveId]);

  const selectedManagerName = useMemo(() => {
    const found = allUsers.find(u => String(u.id) === String(managerId));
    return found ? getUserDisplayName(found) : '';
  }, [allUsers, managerId]);

  const selectedExecutiveName = useMemo(() => {
    const found = allUsers.find(u => String(u.id) === String(executiveId));
    return found ? getUserDisplayName(found) : '';
  }, [allUsers, executiveId]);

  // ── API: Categories ───────────────────────────────────────────────────────
  const { data: rawCategories } = useQuery({
    queryKey: ['renewal-categories', companyMasterId],
    queryFn: () => api.get('/renewal-masters/categories', {
      params: { parentCompanyId: companyMasterId || undefined }
    }).then(r => r.data),
  });
  const categories: any[] = useMemo(() =>
    Array.isArray(rawCategories) ? rawCategories : (Array.isArray(rawCategories?.data) ? rawCategories.data : []),
    [rawCategories]
  );
  const selectedCategoryObj = useMemo(() =>
    categories.find((c: any) => c?.id != null && String(c.id) === categoryId),
    [categories, categoryId]
  );
  const subCategories: any[] = useMemo(() => selectedCategoryObj?.children ?? [], [selectedCategoryObj]);

  // ── API: Service Masters — Strict Filtering by Subcategory / Category ─────
  const { data: rawServiceMasters } = useQuery({
    queryKey: ['renewal-services', companyMasterId, categoryId, subCategoryId],
    queryFn: () => api.get('/renewal-masters/services', {
      params: {
        parentCompanyId: companyMasterId || undefined,
        category_id: categoryId || undefined,
        sub_category_id: subCategoryId || undefined,
      }
    }).then(r => r.data),
    enabled: !!(categoryId || subCategoryId),
  });

  const serviceMasters: any[] = useMemo(() => {
    const raw = rawServiceMasters;
    const list: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    if (!subCategoryId && !categoryId) return [];
    return list.filter((sm: any) => {
      if (subCategoryId) {
        return String(sm.sub_category_id) === subCategoryId || String(sm.sub_category?.id) === subCategoryId;
      }
      if (categoryId) {
        return String(sm.category_id) === categoryId || String(sm.category?.id) === categoryId;
      }
      return true;
    });
  }, [rawServiceMasters, categoryId, subCategoryId]);
  const selectedServiceMasterObj = useMemo(() =>
    serviceMasters.find((s: any) => String(s.id) === serviceMasterId),
    [serviceMasters, serviceMasterId]
  );
  const supportsQuantity = selectedServiceMasterObj?.supports_quantity === true;
  const quantityLabel = selectedServiceMasterObj?.quantity_label || 'Quantity';
  const supportsProvider = selectedServiceMasterObj?.supports_provider !== false;
  const supportsPlanName = selectedServiceMasterObj?.supports_plan_name !== false;

  // ── API: Providers — Filtered strictly by Category Code to prevent mix-ups ─
  const { data: rawProviders } = useQuery({
    queryKey: ['renewal-providers'],
    queryFn: () => api.get('/renewal-masters/providers').then(r => r.data),
  });
  const providers: any[] = useMemo(() => {
    const list: any[] = Array.isArray(rawProviders) ? rawProviders : (Array.isArray(rawProviders?.data) ? rawProviders.data : []);
    if (!selectedCategoryObj?.code) return list;
    const catCode = normalizeCategoryCode(selectedCategoryObj);
    return list.filter((p: any) => {
      if (!p.category_code) return true;
      const pCode = String(p.category_code).toUpperCase();
      return pCode === catCode || pCode === 'ALL';
    });
  }, [rawProviders, selectedCategoryObj]);

  // ── API: Provider Sub-Items (Server Names / Registrar Accounts) ───────────
  const { data: rawProviderSubItems } = useQuery({
    queryKey: ['provider-sub-items', providerId],
    queryFn: () => api.get('/renewal-masters/provider-sub-items', {
      params: { providerId: providerId || undefined }
    }).then(r => r.data),
    enabled: !!providerId,
  });
  const providerSubItems: any[] = useMemo(() => {
    const raw = rawProviderSubItems;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  }, [rawProviderSubItems]);

  // ── API: Service Plans Master — Filtered strictly by Category Code ────────
  const { data: rawServicePlans } = useQuery({
    queryKey: ['service-plans-master'],
    queryFn: () => api.get('/renewal-masters/service-plans').then(r => r.data),
  });
  const servicePlans: any[] = useMemo(() => {
    const list: any[] = Array.isArray(rawServicePlans) ? rawServicePlans : (Array.isArray(rawServicePlans?.data) ? rawServicePlans.data : []);
    if (!selectedCategoryObj?.code) return list;
    const catCode = normalizeCategoryCode(selectedCategoryObj);
    return list.filter((sp: any) => {
      if (!sp.category_code) return true;
      const spCode = String(sp.category_code).toUpperCase();
      return spCode === catCode || spCode === 'ALL';
    });
  }, [rawServicePlans, selectedCategoryObj]);

  // ── API: Contacts — Company Level ─────────────────────────────────────────
  const { data: rawContacts, refetch: refetchContacts } = useQuery({
    queryKey: ['renewal-contacts', clientCompanyId, clientNameInput],
    queryFn: () => api.get('/renewal-masters/contacts', {
      params: clientCompanyId
        ? { clientId: clientCompanyId }
        : { search: clientNameInput || undefined }
    }).then(r => r.data),
    enabled: !!(clientCompanyId || clientNameInput),
  });
  const companyContacts: any[] = useMemo(() => {
    const raw = rawContacts;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  }, [rawContacts]);

  useEffect(() => {
    if (companyContacts.length > 0 && companyContactIds.length === 0) {
      setCompanyContactIds(companyContacts.map(c => String(c.id)));
    }
  }, [companyContacts]);

  // ── API: Reminder Policies ────────────────────────────────────────────────
  const { data: rawPolicies } = useQuery({
    queryKey: ['renewal-settings-policies', companyMasterId, categoryId, serviceMasterId],
    queryFn: () => api.get('/renewal-settings/policies', {
      params: {
        companyId: companyMasterId || undefined,
        categoryId: categoryId || undefined,
        serviceMasterId: serviceMasterId || undefined,
      }
    }).then(r => r.data),
  });
  const reminderPolicies: any[] = useMemo(() =>
    Array.isArray(rawPolicies) ? rawPolicies : (Array.isArray(rawPolicies?.data) ? rawPolicies.data : []),
    [rawPolicies]
  );

  // ── Derived: Expiry Date ──────────────────────────────────────────────────
  const expiryDate = useMemo(() => {
    if (!activationDate || !duration) return '';
    const num = parseInt(duration) || 12;
    const unit = durationUnit.toLowerCase().includes('month') ? 'month' : 'year';
    return dayjs(activationDate).add(num, unit as any).subtract(1, 'day').format('YYYY-MM-DD');
  }, [activationDate, duration, durationUnit]);

  // ── Financial Summary ─────────────────────────────────────────────────────
  const subtotal = useMemo(() => addedServices.reduce((s, svc) => s + (Number(svc.amount_due) || 0), 0), [addedServices]);
  const gstEstimate = useMemo(() => subtotal * (gstRate / 100), [subtotal, gstRate]);
  const totalAmountDue = useMemo(() => subtotal + gstEstimate, [subtotal, gstEstimate]);

  // ── Effect: Auto-fill when Service Master selected ────────────────────────
  useEffect(() => {
    if (!serviceMasterId) return;
    const sm = serviceMasters.find((s: any) => String(s.id) === serviceMasterId);
    if (!sm) return;

    setIdentifierLabel(sm.identifier_label || sm.name || 'Domain / Server Name');
    setRequiresIdentifier(sm.requires_identifier !== false);

    if (sm.default_duration_value) setDuration(String(sm.default_duration_value));
    if (sm.default_duration_unit) setDurationUnit(sm.default_duration_unit.charAt(0).toUpperCase() + sm.default_duration_unit.slice(1));
    if (sm.default_reminder_policy_id) setPolicyId(String(sm.default_reminder_policy_id));
    if (sm.base_price && !isManualPrice) setAmountDue(String(sm.base_price));
    if (sm.supports_quantity) setQuantity(prev => (parseInt(prev) > 0 ? prev : '1'));
    else setQuantity('1');

    if (sm.default_policy?.steps?.length > 0) {
      setFollowupSteps(sm.default_policy.steps.map((st: any, idx: number) => ({
        id: Date.now() + idx,
        offset_days: st.offset_days,
        action_type: st.action_type || (st.channel?.includes('CALL') ? 'CALL_TASK' : 'EMAIL_DIRECT'),
        channel: st.channel ?? 'Email',
        recipient_type: st.recipient_type || 'ALL',
        attach_order_form: st.attach_order_form ?? true,
      })));
    }
  }, [serviceMasterId, serviceMasters, isManualPrice]);

  // ── Effect: Load Policy Steps when policy dropdown changes ────────────────
  useEffect(() => {
    if (!policyId) return;
    const policy = reminderPolicies.find((p: any) => String(p.id) === policyId);
    if (!policy) return;

    if (policy.steps && Array.isArray(policy.steps) && policy.steps.length > 0) {
      setFollowupSteps(policy.steps.map((st: any, idx: number) => ({
        id: Date.now() + idx,
        offset_days: st.offset_days,
        action_type: st.action_type || (st.channel?.includes('CALL') ? 'CALL_TASK' : 'EMAIL_DIRECT'),
        channel: st.channel ?? 'Email',
        recipient_type: st.recipient_type || 'ALL',
        attach_order_form: st.attach_order_form ?? true,
      })));
    }
  }, [policyId, reminderPolicies]);

  // ── Follow-up step helpers ────────────────────────────────────────────────
  const addFollowupStep = () => {
    setFollowupSteps(prev => [...prev, { id: Date.now(), offset_days: 30, action_type: 'EMAIL_DIRECT', channel: 'Email', recipient_type: 'ALL', attach_order_form: true }]);
  };
  const deleteFollowupStep = (id: number) => setFollowupSteps(prev => prev.filter(s => s.id !== id));
  const updateFollowupStep = (id: number, field: keyof FollowupStep, value: any) =>
    setFollowupSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

  const calcStepDate = (offsetDays: number, expiry?: string) => {
    const d = expiry || expiryDate;
    if (!d) return '—';
    return dayjs(d).subtract(offsetDays, 'day').format('DD MMM YYYY');
  };

  // ── Reset Service Form ────────────────────────────────────────────────────
  const resetServiceForm = () => {
    setEditingServiceId(null);
    setCategoryId(''); setSubCategoryId(''); setServiceMasterId('');
    setIdentifierLabel('Domain / Server Name'); setRequiresIdentifier(true);
    setIdentifier(''); setProviderId(''); setServerSubName(''); setPlanName('');
    setActivationDate(dayjs().format('YYYY-MM-DD'));
    setDuration('12'); setDurationUnit('Months');
    setQuantity('1');
    setAmountDue('0'); setIsManualPrice(false);
    setPolicyId(''); setFollowupSteps([]);
    setServiceContactId('');
  };

  // ── Save Service Line ─────────────────────────────────────────────────────
  const handleSaveServiceLine = () => {
    if (!categoryId) {
      toast.error('Please select a service category');
      return;
    }
    if (!serviceMasterId) {
      toast.error('Please select a service master');
      return;
    }
    if (requiresIdentifier && !identifier.trim()) {
      toast.error(`Please enter the ${identifierLabel}`);
      return;
    }
    if (selectedServiceMasterObj?.requires_quantity && (!quantity || parseInt(quantity) < 1)) {
      toast.error(`Please enter the ${quantityLabel}`);
      return;
    }

    const catObj = categories.find((c: any) => String(c.id) === categoryId);
    const subObj = subCategories.find((sc: any) => String(sc.id) === subCategoryId);
    const smObj = serviceMasters.find((s: any) => String(s.id) === serviceMasterId);
    const provObj = providers.find((p: any) => String(p.id) === providerId);
    const polObj = reminderPolicies.find((p: any) => String(p.id) === policyId);

    const lineItem: ServiceLine = {
      id: editingServiceId ?? Date.now(),
      category_name: catObj?.name ?? 'General',
      sub_category_name: subObj?.name ?? '',
      service_name: smObj?.name ?? identifier,
      identifier_label: identifierLabel,
      service_master_id: serviceMasterId ? parseInt(serviceMasterId) : null,
      identifier: identifier.trim(),
      provider_id: supportsProvider && providerId ? parseInt(providerId) : null,
      provider_name: provObj?.name ?? '—',
      server_name: supportsProvider ? serverSubName : '',
      plan_name: supportsPlanName ? planName : '',
      quantity: supportsQuantity ? Math.max(1, parseInt(quantity) || 1) : 1,
      activation_date: activationDate,
      expiry_date: expiryDate,
      duration: parseInt(duration) || 12,
      duration_unit: durationUnit,
      amount_due: parseFloat(amountDue) || 0,
      reminder_policy_id: policyId ? parseInt(policyId) : null,
      policy_name: polObj?.name ?? 'Custom Schedule',
      followup_steps: [...followupSteps],
      customer_contact_id: serviceContactId ? parseInt(serviceContactId) : null,
    };

    if (editingServiceId != null) {
      setAddedServices(prev => prev.map(s => s.id === editingServiceId ? lineItem : s));
      toast.success(`Service "${lineItem.service_name}" updated!`);
    } else {
      setAddedServices(prev => [...prev, lineItem]);
      toast.success(`"${lineItem.service_name}" added to renewal!`);
    }

    resetServiceForm();
    setShowServiceForm(false);
  };

  // ── Edit Service ──────────────────────────────────────────────────────────
  const handleEditService = (svc: ServiceLine) => {
    setEditingServiceId(svc.id);
    setIdentifier(svc.identifier);
    setIdentifierLabel(svc.identifier_label);
    if (svc.provider_id) setProviderId(String(svc.provider_id));
    setServerSubName(svc.server_name);
    setPlanName(svc.plan_name);
    setQuantity(String(svc.quantity || 1));
    setActivationDate(svc.activation_date);
    setDuration(String(svc.duration));
    setDurationUnit(svc.duration_unit);
    setAmountDue(String(svc.amount_due));
    if (svc.reminder_policy_id) setPolicyId(String(svc.reminder_policy_id));
    setFollowupSteps([...svc.followup_steps]);
    setServiceContactId(svc.customer_contact_id ? String(svc.customer_contact_id) : '');
    setShowServiceForm(true);
    toast('Editing service — save when done.', { icon: '✏️' });
  };

  // ── Add Contact mutation ──────────────────────────────────────────────────
  const createContactMutation = useMutation({
    mutationFn: (data: any) => api.post('/renewal-masters/contacts', {
      client_company_id: clientCompanyId ? parseInt(clientCompanyId) : undefined,
      company_name: clientNameInput,
      name: data.name,
      email: data.email || undefined,
      mobile: data.mobile || undefined,
      designation: data.designation || undefined,
    }),
    onSuccess: (res: any) => {
      toast.success('Contact added successfully!');
      refetchContacts();
      setShowAddContactModal(false);
      const createdId = res?.data?.id ?? res?.id;
      if (createdId) setCompanyContactIds(prev => [...prev, String(createdId)]);
      setNewContactName(''); setNewContactEmail(''); setNewContactPhone(''); setNewContactDesignation('');
    },
    onError: (err: any) => toast.error(formatApiError(err) || 'Failed to add contact'),
  });

  // ── Add Client Company mutation ───────────────────────────────────────────
  const createClientCompanyMutation = useMutation({
    mutationFn: (name: string) => api.post('/masters/clientcompany', { name: name.trim() }),
    onSuccess: (res: any) => {
      toast.success('Client company created!');
      refetchClientCompanies();
      setShowAddClientModal(false);
      const createdId = res?.data?.id ?? res?.id;
      const createdName = res?.data?.name ?? res?.name ?? newClientName;
      if (createdId) {
        setClientCompanyId(String(createdId));
        setClientNameInput(createdName);
      }
      setNewClientName('');
    },
    onError: (err: any) => toast.error(formatApiError(err) || 'Failed to create client company'),
  });

  // ── Submit Renewal ────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async (isActivate: boolean) => {
      if (!companyMasterId) throw new Error('Parent Company Master (e.g. ANGLER or Trinetra) is required.');
      if (!clientNameInput) throw new Error('Client Company selection is required.');
      if (companyContactIds.length === 0) throw new Error('At least one client contact must be selected for monthly digest emails.');
      if (addedServices.length === 0) throw new Error('At least one service line item is required.');
      const payload = {
        company_id: companyMasterId ? parseInt(companyMasterId) : undefined,
        client_name: clientNameInput,
        client_company_id: clientCompanyId ? parseInt(clientCompanyId) : undefined,
        account_name: `${clientNameInput} Renewal Account`,
        account_manager_id: managerId ? parseInt(managerId) : undefined,
        assigned_executive_id: executiveId ? parseInt(executiveId) : undefined,
        renewal_executive_id: executiveId ? parseInt(executiveId) : undefined,
        contact_ids: companyContactIds.map(cid => parseInt(cid)),
        status: isActivate ? 'ACTIVE' : (editAccount?.status || 'ACTIVE'),
        services: addedServices.map(s => ({
          id: typeof s.id === 'number' && s.id < 1000000000000 ? s.id : undefined,
          service_master_id: s.service_master_id,
          identifier: s.identifier,
          provider_id: s.provider_id,
          server_name: s.server_name,
          plan_name: s.plan_name,
          quantity: s.quantity,
          email_count: s.quantity,
          activation_date: s.activation_date,
          expiry_date: s.expiry_date,
          duration: s.duration,
          duration_value: s.duration,
          duration_unit: s.duration_unit,
          amount_due: s.amount_due,
          reminder_policy_id: s.reminder_policy_id,
          followup_steps: s.followup_steps,
          customer_contact_id: s.customer_contact_id,
        })),
      };

      let resData: any;
      if (id) {
        const res = await api.put(`/renewals/${id}`, payload);
        resData = res.data;
      } else {
        const res = await api.post('/renewals', payload);
        if (isActivate && res.data?.id) await api.post(`/renewals/${res.data.id}/activate`);
        resData = res.data;
      }
      return resData;
    },
    onSuccess: (_, isActivate) => {
      toast.success(id ? 'Renewal account updated successfully!' : (isActivate ? 'Renewal activated!' : 'Draft saved!'));
      qc.invalidateQueries({ queryKey: ['renewals'] });
      qc.invalidateQueries({ queryKey: ['renewal', id] });
      qc.invalidateQueries({ queryKey: ['renewal-dashboard'] });
      navigate(id ? `/renewals/${id}` : '/renewals/register');
    },
    onError: (err: any) => toast.error(formatApiError(err)),
  });

  const STEPS = [
    { step: 1, label: 'Company & Ownership' },
    { step: 2, label: 'Contacts & Services' },
    { step: 3, label: 'Review & Activate' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrapper space-y-4">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">{id ? `Edit Renewal Account #${id}` : 'New Renewal Registration'}</h1>
          <p className="page-subtitle">
            {id
              ? `Modify company hierarchy, attached contacts, and service lines for ${clientNameInput || 'this account'}.`
              : 'Select company master, attach client company contacts, and configure consolidated renewal service lines.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/renewals/follow-ups')} className="btn btn-ghost text-xs py-1.5 px-3 border border-slate-300 flex items-center gap-1.5">
            <Clock size={14} /> Follow-up Queue
          </button>
          <button onClick={() => navigate(id ? `/renewals/${id}` : '/renewals/register')} className="btn btn-ghost text-xs py-1.5 px-3 border border-slate-300">✕ Exit</button>
        </div>
      </div>

      {/* Wizard Steps Bar */}
      <div className="card px-5 py-3.5 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => { if (s.step < currentStep) setCurrentStep(s.step); }}
                className="flex items-center gap-2.5 focus:outline-none"
              >
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 shadow-sm',
                  currentStep > s.step ? 'bg-emerald-500 text-white' :
                  currentStep === s.step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                  'bg-slate-100 text-slate-500'
                )}>
                  {currentStep > s.step ? '✓' : s.step}
                </div>
                <span className={clsx(
                  'text-xs font-bold transition-colors',
                  currentStep === s.step ? 'text-blue-700' :
                  currentStep > s.step ? 'text-emerald-600' : 'text-slate-400'
                )}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={clsx('flex-1 h-0.5 mx-4 rounded', currentStep > s.step ? 'bg-emerald-400' : 'bg-slate-200')} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Left: Active Stage ─────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-4">

          {/* ═════════════════ STAGE 1 ═════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <Building size={16} className="text-blue-600" /> Company Master & Client Ownership
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select the parent Company Master and target Client Company entity.</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 font-extrabold px-3 py-1 rounded-full border border-blue-200">Step 1 of 3</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Parent Company Master */}
                <SearchableSelect
                  label="Company Master (Parent Organization)"
                  value={companyMasterId}
                  onChange={id => {
                    setCompanyMasterId(id);
                    setCategoryId('');
                    setSubCategoryId('');
                    setServiceMasterId('');
                    setProviderId('');
                    setServerSubName('');
                    setPlanName('');
                    setQuantity('1');
                    setPolicyId('');
                    setFollowupSteps([]);
                  }}
                  options={companyMasters.map(c => ({ value: String(c.id), label: c.name }))}
                  placeholder="Type or select Company Master..."
                  subLabel={selectedCompanyMasterObj ? `✓ Parent: ${selectedCompanyMasterObj.name}` : undefined}
                />

                {/* Client Company Selection with Quick Add Button */}
                <div>
                  <SearchableSelect
                    label="Select Client Company"
                    required
                    value={clientCompanyId}
                    onChange={id => {
                      setClientCompanyId(id);
                      setCompanyContactIds([]);
                      setAddedServices(prev => prev.map(s => ({ ...s, customer_contact_id: null })));
                      const found = clientCompanies.find(c => String(c.id) === id);
                      if (found) { setClientNameInput(found.name); toast.success(`"${found.name}" selected`); }
                    }}
                    options={clientCompanies.map(c => ({ value: String(c.id), label: c.name }))}
                    placeholder="Type or select Client Company..."
                  />
                  <div className="flex items-center justify-between mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddClientModal(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      + Add New Client Company
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/masters/clientcompany')}
                      className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                    >
                      Manage Masters <ExternalLink size={10} />
                    </button>
                  </div>
                </div>

                {/* Account Manager */}
                <SearchableSelect
                  label="Account Manager (Sales Manager)"
                  value={managerId}
                  onChange={setManagerId}
                  options={managerOptions}
                  placeholder="Type to filter manager..."
                  subLabel={selectedManagerName ? `✓ Manager: ${selectedManagerName}` : undefined}
                />

                {/* Executive */}
                <SearchableSelect
                  label="Assigned Executive (Sales Person)"
                  value={executiveId}
                  onChange={setExecutiveId}
                  options={executiveOptions}
                  placeholder="Type to filter executive..."
                  subLabel={selectedExecutiveName ? `✓ Executive: ${selectedExecutiveName}` : undefined}
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (!companyMasterId) {
                      toast.error('Please select a Parent Company Master (e.g. ANGLER or Trinetra)');
                      return;
                    }
                    if (!clientCompanyId && !clientNameInput.trim()) {
                      toast.error('Please select a Client Company entity');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  className="btn btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 shadow-md"
                >
                  Next: Contacts & Services <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ═════════════════ STAGE 2 ═════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-4">

              {/* Company Level Contacts Header Bar */}
              <div className="card p-4 border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-blue-900 flex items-center gap-2">
                      <UserCheck size={15} className="text-blue-600" /> Company Contacts for Consolidated Digests
                    </h3>
                    <p className="text-[10px] text-blue-700 mt-0.5">
                      All selected contacts for <strong>{clientNameInput}</strong> will receive unified monthly renewal digest emails.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddContactModal(true)}
                    className="btn btn-ghost text-xs py-1 px-3 border border-blue-300 text-blue-700 font-bold bg-white hover:bg-blue-50 rounded-xl shadow-sm flex items-center gap-1"
                  >
                    <UserPlus size={13} /> + Add Contact
                  </button>
                </div>

                {companyContacts.length === 0 ? (
                  <div className="p-3 bg-white border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                    <span>No contacts registered for <strong>{clientNameInput}</strong>.</span>
                    <button type="button" onClick={() => setShowAddContactModal(true)} className="btn btn-primary text-xs py-1 px-3 font-bold">+ Create Contact</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {companyContacts.map((c: any) => {
                      const isSelected = companyContactIds.includes(String(c.id));
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            const removing = companyContactIds.includes(String(c.id));
                            setCompanyContactIds(prev =>
                              removing ? prev.filter(x => x !== String(c.id)) : [...prev, String(c.id)]
                            );
                            if (removing) {
                              setAddedServices(prev => prev.map(s =>
                                s.customer_contact_id === c.id ? { ...s, customer_contact_id: null } : s
                              ));
                            }
                          }}
                          className={clsx(
                            'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm',
                            isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:border-blue-300'
                          )}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>{c.name}</span>
                          <span className="opacity-75 text-[10px]">({c.designation || c.email || 'Contact'})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {companyContactIds.length === 0 && (
                  <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <span>Rule Warning: Click on at least one contact above to attach them for monthly digest emails.</span>
                    </div>
                    {companyContacts.length === 0 && (
                      <button type="button" onClick={() => setShowAddContactModal(true)} className="btn btn-warning text-xs py-1 px-3 font-bold">+ Create Contact</button>
                    )}
                  </div>
                )}
              </div>

              {/* Added Services List */}
              {addedServices.length > 0 && (
                <div className="card overflow-hidden border border-slate-200">
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Layers size={15} className="text-blue-600" /> Services Added ({addedServices.length})
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Consolidated for: <span className="font-bold text-slate-800">{clientNameInput}</span></p>
                    </div>
                    {!showServiceForm && (
                      <button
                        type="button"
                        onClick={() => { resetServiceForm(); setShowServiceForm(true); }}
                        className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold shadow-sm"
                      >
                        <Plus size={13} /> Add Another Service
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table-base w-full text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                        <tr>
                          <th className="p-2.5 text-left">Service</th>
                          <th className="p-2.5 text-left">Provider & Server / Plan</th>
                          <th className="p-2.5 text-left">Identifier</th>
                          <th className="p-2.5 text-center">Expiry</th>
                          <th className="p-2.5 text-center">Steps</th>
                          <th className="p-2.5 text-right">Amount</th>
                          <th className="p-2.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {addedServices.map(s => (
                          <tr key={s.id} className={clsx('hover:bg-slate-50', editingServiceId === s.id && 'bg-blue-50/70')}>
                            <td className="p-2.5">
                              <p className="font-bold text-slate-800">{s.service_name}</p>
                              <p className="text-[10px] text-slate-500">{s.category_name}{s.sub_category_name ? ` › ${s.sub_category_name}` : ''}</p>
                            </td>
                            <td className="p-2.5">
                              <p className="font-semibold text-slate-700">{s.provider_name}</p>
                              {(s.server_name || s.plan_name) && (
                                <p className="text-[10px] text-slate-500">{s.server_name} {s.plan_name ? `• ${s.plan_name}` : ''}</p>
                              )}
                            </td>
                            <td className="p-2.5">
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{s.identifier_label}</p>
                              <p className="font-mono text-slate-800 text-[11px] font-bold">{s.identifier || '—'}</p>
                            </td>
                            <td className="p-2.5 text-center text-slate-700 text-[11px] font-bold">{fmtDate(s.expiry_date)}</td>
                            <td className="p-2.5 text-center">
                              <span className="text-[10px] bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded-full border border-violet-200">
                                {s.followup_steps.length} steps
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 text-xs">{fmt(s.amount_due)}</td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button type="button" onClick={() => handleEditService(s)} className="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50" title="Edit">
                                  <Edit size={14} />
                                </button>
                                <button type="button" onClick={() => setAddedServices(prev => prev.filter(x => x.id !== s.id))} className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Add / Edit Service Form Card */}
              {showServiceForm && (
                <div className={clsx('card p-5 space-y-5 border-2 shadow-sm', editingServiceId != null ? 'border-blue-400 bg-blue-50/10' : 'border-slate-200')}>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      {editingServiceId != null ? <Edit size={15} className="text-blue-600" /> : <Plus size={15} className="text-blue-600" />}
                      {editingServiceId != null ? 'Editing Service Line' : 'Add New Service Line'}
                    </h3>
                    {addedServices.length > 0 && (
                      <button type="button" onClick={() => { resetServiceForm(); setShowServiceForm(false); }} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* ── Service Cascading Masters Section ────────────────── */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Service Details & Master References</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">

                      {/* Category */}
                      <SearchableSelect
                        label="Category"
                        required
                        value={categoryId}
                        onChange={id => {
                          setCategoryId(id);
                          setSubCategoryId('');
                          setServiceMasterId('');
                          setProviderId('');
                          setServerSubName('');
                          setPlanName('');
                          setQuantity('1');
                          setPolicyId('');
                          setFollowupSteps([]);
                        }}
                        options={categories.map((c: any) => ({ value: String(c.id), label: c.name }))}
                        placeholder="Type or select Category..."
                      />

                      {/* Subcategory */}
                      {subCategories.length > 0 && (
                        <SearchableSelect
                          label="Subcategory"
                          value={subCategoryId}
                          onChange={id => {
                            setSubCategoryId(id);
                            setServiceMasterId('');
                            setQuantity('1');
                            setPolicyId('');
                            setFollowupSteps([]);
                          }}
                          options={subCategories.map((sc: any) => ({ value: String(sc.id), label: sc.name }))}
                          placeholder="Type or select Subcategory..."
                        />
                      )}

                      {/* Service Master — strictly filtered by Category / Subcategory */}
                      <SearchableSelect
                        label="Service Master"
                        required
                        value={serviceMasterId}
                        onChange={id => {
                          setServiceMasterId(id);
                          setProviderId('');
                          setServerSubName('');
                          setPlanName('');
                          setQuantity('1');
                          setPolicyId('');
                          setFollowupSteps([]);
                        }}
                        options={serviceMasters.map((sm: any) => ({ value: String(sm.id), label: sm.name }))}
                        placeholder={categoryId ? `Type or select Service (${serviceMasters.length} items)...` : "— Select Category first —"}
                        disabled={!categoryId}
                      />

                      {supportsProvider && (
                        <SearchableSelect
                          label="Service / Server Provider"
                          value={providerId}
                          onChange={id => { setProviderId(id); setServerSubName(''); }}
                          options={providers.map((p: any) => ({ value: String(p.id), label: p.name }))}
                          placeholder="Type or select Provider..."
                        />
                      )}

                      {/* Server Name / Account Name (Cascaded Sub-Item) */}
                      {supportsProvider && providerSubItems.length > 0 && (
                        <SearchableSelect
                          label="Server Name / Registrar Account"
                          value={serverSubName}
                          onChange={setServerSubName}
                          options={providerSubItems.map((item: any) => ({ value: item.name, label: item.name }))}
                          placeholder="Type or select Server / Account..."
                        />
                      )}

                      {supportsPlanName && (
                        <SearchableSelect
                          label="Service Plan"
                          value={planName}
                          onChange={setPlanName}
                          options={servicePlans.map((p: any) => ({ value: p.name, label: p.name }))}
                          placeholder="Type or select Plan..."
                        />
                      )}

                      {supportsQuantity && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {quantityLabel}{selectedServiceMasterObj?.requires_quantity ? <span className="text-red-500"> *</span> : null}
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            className="w-full text-xs font-mono font-bold text-slate-900 px-3 py-2.5 rounded-xl border border-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      )}

                      {/* Dynamic Identifier Text Box */}
                      {requiresIdentifier && (
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            {identifierLabel} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder={`Enter ${identifierLabel.toLowerCase()} (e.g. domain.com, server IP, etc.)...`}
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            className="w-full text-xs font-mono font-bold rounded-xl border border-slate-300 px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-blue-900"
                          />
                        </div>
                      )}

                      {/* Activation Date */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Activation Date</label>
                        <input
                          type="date"
                          value={activationDate}
                          onChange={e => setActivationDate(e.target.value)}
                          className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            className="w-20 text-xs font-bold rounded-xl border border-slate-300 px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <select
                            value={durationUnit}
                            onChange={e => setDurationUnit(e.target.value)}
                            className="flex-1 text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option>Months</option>
                            <option>Years</option>
                          </select>
                        </div>
                      </div>

                      {/* Expiry Date (Auto-calc) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Expiry Date (Auto-calc)</label>
                        <input
                          type="text"
                          readOnly
                          value={expiryDate ? fmtDate(expiryDate) : '—'}
                          className="w-full text-xs font-bold rounded-xl border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2.5 cursor-not-allowed shadow-sm"
                        />
                      </div>

                      {/* Amount Due */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount Due (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">₹</span>
                          <input
                            type="text"
                            value={amountDue}
                            onChange={e => { setAmountDue(e.target.value); setIsManualPrice(true); }}
                            className="w-full text-xs font-mono font-bold text-slate-900 pl-7 pr-3 py-2.5 rounded-xl border border-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Follow-up Schedule Section (Flexible Multi-Channel Selection) ── */}
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Follow-up Schedule</p>
                      {expiryDate && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          Expiry: {fmtDate(expiryDate)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <SearchableSelect
                          label="Load from Policy Template"
                          value={policyId}
                          onChange={setPolicyId}
                          options={reminderPolicies.map((p: any) => ({
                            value: String(p.id),
                            label: p.name,
                            detail: `${p.steps?.length ?? 0} steps${p.is_default ? ' • Default' : ''}`
                          }))}
                          placeholder="Type or select policy template..."
                        />
                      </div>
                      {policyId && (
                        <button type="button" onClick={() => { setPolicyId(''); setFollowupSteps([]); }} title="Clear policy" className="btn btn-ghost text-xs p-2.5 border border-slate-300 text-slate-500 rounded-xl">
                          <RefreshCw size={13} />
                        </button>
                      )}
                    </div>

                    {/* Well-proportioned Follow-up Steps Table */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          Follow-up Steps ({followupSteps.length})
                        </p>
                        <button type="button" onClick={addFollowupStep} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800">
                          <Plus size={13} /> Add Custom Step
                        </button>
                      </div>

                      {followupSteps.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400">
                          <Bell size={24} className="mx-auto mb-2 opacity-30 text-blue-600" />
                          Select a policy template above or click "+ Add Custom Step" to define alert schedule.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                                <th className="py-2 px-3 w-28">Days Before</th>
                                <th className="py-2 px-3 w-48">Action Mode</th>
                                <th className="py-2 px-3 w-36">Channels</th>
                                <th className="py-2 px-3 w-36">Target</th>
                                <th className="py-2 px-3 w-32 text-center">Calculated Date</th>
                                <th className="py-2 px-3 w-28 text-center" title="Attach Order Form PDF to this step's email">📄 Order Form</th>
                                <th className="py-2 px-2 w-10 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {followupSteps.map(step => (
                                <tr key={step.id} className="hover:bg-slate-50/80">
                                  <td className="py-2 px-3">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={step.offset_days}
                                        onChange={e => updateFollowupStep(step.id, 'offset_days', parseInt(e.target.value) || 1)}
                                        className="w-16 text-xs py-1 px-2 font-mono font-bold text-blue-700 rounded-lg border border-slate-300 shadow-sm focus:ring-1 focus:ring-blue-500"
                                      />
                                      <span className="text-[10px] text-slate-500 font-semibold">days</span>
                                    </div>
                                  </td>

                                  {/* Action Mode Selector */}
                                  <td className="py-2 px-3">
                                    <select
                                      value={step.action_type || 'EMAIL_DIRECT'}
                                      onChange={e => updateFollowupStep(step.id, 'action_type', e.target.value)}
                                      className="w-full text-[11px] font-bold py-1 px-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 shadow-sm"
                                    >
                                      <option value="EMAIL_DIRECT">📧 Auto Send Email</option>
                                      <option value="EMAIL_DRAFT">📝 Draft Email (Needs Review)</option>
                                      <option value="CALL_TASK">📞 Call Task for Executive</option>
                                      <option value="IN_APP">🔔 Internal CRM Alert</option>
                                    </select>
                                  </td>

                                  {/* Multi-Channel Action Selector */}
                                  <td className="py-2 px-3">
                                    <div className="flex items-center gap-1">
                                      {['Email', 'Call', 'SMS'].map(ch => {
                                        const isChecked = (step.channel || 'Email').includes(ch);
                                        return (
                                          <button
                                            key={ch}
                                            type="button"
                                            onClick={() => {
                                              const channels = step.channel ? step.channel.split(' + ') : [];
                                              const next = isChecked ? channels.filter(c => c !== ch) : [...channels, ch];
                                              updateFollowupStep(step.id, 'channel', next.join(' + ') || 'Email');
                                            }}
                                            className={clsx(
                                              'text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all',
                                              isChecked ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-300'
                                            )}
                                          >
                                            {ch}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </td>

                                  <td className="py-2 px-3">
                                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 block truncate">
                                      All Company Contacts
                                    </span>
                                  </td>

                                  <td className="py-2 px-3 text-center">
                                    <span className={clsx(
                                      'text-[10px] font-bold px-2 py-1 rounded-full border inline-block',
                                      expiryDate ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                                    )}>
                                      {calcStepDate(step.offset_days)}
                                    </span>
                                  </td>

                                  {/* Attach Order Form toggle */}
                                  <td className="py-2 px-3 text-center">
                                    {(step.channel || 'Email').toLowerCase().includes('email') ? (
                                      <label className="inline-flex flex-col items-center gap-0.5 cursor-pointer group" title="Attach Order Form PDF to this email step">
                                        <div className="relative">
                                          <input
                                            type="checkbox"
                                            checked={step.attach_order_form ?? true}
                                            onChange={e => updateFollowupStep(step.id, 'attach_order_form', e.target.checked)}
                                            className="sr-only peer"
                                          />
                                          <div className={clsx(
                                            'w-9 h-5 rounded-full border-2 transition-all',
                                            (step.attach_order_form ?? true)
                                              ? 'bg-blue-600 border-blue-600'
                                              : 'bg-slate-200 border-slate-300'
                                          )}>
                                            <div className={clsx(
                                              'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all',
                                              (step.attach_order_form ?? true) ? 'left-4' : 'left-0.5'
                                            )} />
                                          </div>
                                        </div>
                                        <span className={clsx(
                                          'text-[9px] font-bold',
                                          (step.attach_order_form ?? true) ? 'text-blue-600' : 'text-slate-400'
                                        )}>
                                          {(step.attach_order_form ?? true) ? 'PDF On' : 'PDF Off'}
                                        </span>
                                      </label>
                                    ) : (
                                      <span className="text-[9px] text-slate-300 font-semibold">N/A</span>
                                    )}
                                  </td>

                                  <td className="py-2 px-2 text-center">
                                    <button type="button" onClick={() => deleteFollowupStep(step.id)} className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50">
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service-Level Customer Contact */}
                  {companyContacts.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Contact <span className="text-slate-400 font-normal">(for this service)</span></label>
                      <select
                        value={serviceContactId}
                        onChange={e => setServiceContactId(e.target.value)}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="">— No specific contact —</option>
                        {companyContacts
                          .filter(c => companyContactIds.includes(String(c.id)))
                          .map(c => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}{c.designation ? ` (${c.designation})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    {addedServices.length > 0 && (
                      <button type="button" onClick={() => { resetServiceForm(); setShowServiceForm(false); }} className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold">Cancel</button>
                    )}
                    <button type="button" onClick={handleSaveServiceLine} className="btn btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5 shadow-md">
                      <Save size={13} />
                      {editingServiceId != null ? 'Update Service' : '+ Save Service Line'}
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Stage Navigation */}
              <div className="flex justify-between pt-2">
                <button type="button" onClick={() => setCurrentStep(1)} className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold flex items-center gap-1.5">
                  <ArrowLeft size={13} /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (companyContactIds.length === 0) {
                      toast.error('⚠️ Critical Warning: Please select at least one company contact for monthly digest emails before proceeding.');
                      return;
                    }
                    if (addedServices.length === 0) {
                      toast.error('Please add at least one service line item before proceeding to review.');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  className="btn btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-1.5 shadow-md"
                >
                  Next: Review & Activate <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ═════════════════ STAGE 3 ═════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="card p-6 space-y-5 border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" /> Review & Activate
                  </h3>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200">Final Step</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Company Hierarchy Profile</p>
                    {selectedCompanyMasterObj && <p className="text-slate-500 font-bold">Parent: {selectedCompanyMasterObj.name}</p>}
                    <p className="font-extrabold text-slate-900 text-sm">{clientNameInput}</p>
                    {selectedClientCompanyObj && <p className="text-slate-500 font-semibold">{selectedClientCompanyObj.name}</p>}
                    {selectedManagerName && <p className="text-slate-600 text-[11px]">👤 Manager: <span className="font-bold text-slate-800">{selectedManagerName}</span></p>}
                    {selectedExecutiveName && <p className="text-slate-600 text-[11px]">👤 Executive: <span className="font-bold text-slate-800">{selectedExecutiveName}</span></p>}
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase">Financial Overview</p>
                    <div className="flex justify-between text-slate-700"><span>Subtotal ({addedServices.length} services)</span><span className="font-mono font-bold">{fmt(subtotal)}</span></div>
                    <div className="flex justify-between text-slate-500"><span>GST ({gstRate}%)</span><span className="font-mono">{fmt(gstEstimate)}</span></div>
                    <div className="flex justify-between text-emerald-950 font-bold border-t border-emerald-200 pt-2 mt-1"><span>Total Due</span><span className="font-mono text-base">{fmt(totalAmountDue)}</span></div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Services Summary</p>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="table-base w-full text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                        <tr>
                          <th className="p-2.5 text-left">Service</th>
                          <th className="p-2.5 text-left">Provider & Server / Plan</th>
                          <th className="p-2.5 text-left">Identifier</th>
                          <th className="p-2.5 text-center">Expiry</th>
                          <th className="p-2.5 text-center">Steps</th>
                          <th className="p-2.5 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {addedServices.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="p-2.5">
                              <p className="font-bold text-slate-800">{s.service_name}</p>
                              <p className="text-[10px] text-slate-400">{s.policy_name}</p>
                            </td>
                            <td className="p-2.5">
                              <p className="font-semibold text-slate-700">{s.provider_name}</p>
                              {(s.server_name || s.plan_name) && (
                                <p className="text-[10px] text-slate-500">{s.server_name} {s.plan_name ? `• ${s.plan_name}` : ''}</p>
                              )}
                            </td>
                            <td className="p-2.5">
                              <p className="text-[9px] text-slate-400 uppercase">{s.identifier_label}</p>
                              <p className="font-mono text-slate-800 text-[11px] font-bold">{s.identifier || '—'}</p>
                            </td>
                            <td className="p-2.5 text-center text-[11px] font-bold">{fmtDate(s.expiry_date)}</td>
                            <td className="p-2.5 text-center text-slate-600 text-[11px] font-bold">{s.followup_steps.length}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">{fmt(s.amount_due)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                  <p className="font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                    <ShieldCheck size={16} className="text-blue-600" /> Pre-Flight Rule & Validation Checklist
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className={clsx('p-2.5 rounded-xl border flex items-center justify-between', companyMasterId ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800')}>
                      <span className="font-bold">1. Parent Company Master</span>
                      <span className="font-extrabold text-[11px]">{companyMasterId ? `✓ ${selectedCompanyMasterObj?.name || 'Set'}` : '🔴 Required'}</span>
                    </div>

                    <div className={clsx('p-2.5 rounded-xl border flex items-center justify-between', clientNameInput ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800')}>
                      <span className="font-bold">2. Client Company</span>
                      <span className="font-extrabold text-[11px]">{clientNameInput ? `✓ ${clientNameInput}` : '🔴 Required'}</span>
                    </div>

                    <div className={clsx('p-2.5 rounded-xl border flex items-center justify-between', companyContactIds.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-900')}>
                      <span className="font-bold">3. Client Digest Contacts</span>
                      <span className="font-extrabold text-[11px]">{companyContactIds.length > 0 ? `✓ ${companyContactIds.length} Attached` : '⚠️ 0 Attached (Required)'}</span>
                    </div>

                    <div className={clsx('p-2.5 rounded-xl border flex items-center justify-between', addedServices.length > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800')}>
                      <span className="font-bold">4. Services Lines</span>
                      <span className="font-extrabold text-[11px]">{addedServices.length > 0 ? `✓ ${addedServices.length} Line Items` : '🔴 Required'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setCurrentStep(2)} className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold flex items-center gap-1.5">
                    <ArrowLeft size={13} /> Back
                  </button>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          toast.loading('Generating Order Form PDF Preview...', { id: 'pdf-prev' });
                          const payload = {
                            company_id: companyMasterId ? parseInt(companyMasterId) : undefined,
                            client_name: clientNameInput || 'Valued Customer',
                            client_company_id: clientCompanyId ? parseInt(clientCompanyId) : undefined,
                            account_manager_id: managerId ? parseInt(managerId) : undefined,
                            assigned_executive_id: executiveId ? parseInt(executiveId) : undefined,
                            contact_ids: companyContactIds.map(id => parseInt(id)),
                            services: addedServices.map(s => ({
                              service_master_id: s.service_master_id,
                              service_name: s.service_name,
                              identifier: s.identifier,
                              provider_id: s.provider_id,
                              server_name: s.server_name,
                              plan_name: s.plan_name,
                              quantity: s.quantity,
                              email_count: s.quantity,
                              activation_date: s.activation_date,
                              expiry_date: s.expiry_date,
                              duration: s.duration,
                              duration_unit: s.duration_unit,
                              amount_due: s.amount_due,
                            })),
                          };
                          const res = await api.post('/renewals/preview-pdf', payload);
                          toast.success('Preview PDF ready!', { id: 'pdf-prev' });
                          if (res.data?.pdfResult?.relativeUrl) {
                            const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                            const serverHost = apiBase.replace(/\/api\/?$/, '');
                            const relativeUrl = res.data.pdfResult.relativeUrl;
                            const fullPdfUrl = relativeUrl.startsWith('http') ? relativeUrl : `${serverHost}${relativeUrl}`;
                            window.open(fullPdfUrl, '_blank');
                          }
                        } catch (err: any) {
                          toast.error(err.response?.data?.message || 'Failed to generate preview', { id: 'pdf-prev' });
                        }
                      }}
                      disabled={addedServices.length === 0}
                      className="btn btn-ghost text-xs py-2.5 px-4 border border-blue-200 text-blue-700 bg-blue-50/70 hover:bg-blue-100 font-bold flex items-center gap-1.5"
                    >
                      <FileText size={14} /> Preview Order Form PDF
                    </button>
                    <button type="button" onClick={() => submitMutation.mutate(false)} disabled={submitMutation.isPending} className="btn btn-ghost text-xs py-2.5 px-5 border border-slate-300 font-bold flex items-center gap-1.5">
                      <Save size={13} /> Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => submitMutation.mutate(true)}
                      disabled={submitMutation.isPending || addedServices.length === 0}
                      className="btn btn-primary text-xs py-2.5 px-6 font-extrabold shadow-md flex items-center gap-2"
                    >
                      <CheckCircle2 size={15} /> Activate Renewal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Live Preview Panel with Dynamic Inline GST Editing ───── */}
        <div className="lg:col-span-4 space-y-3">

          {/* Client Snapshot */}
          <div className="card p-4 border border-slate-200 space-y-3 text-xs shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                <Building size={12} className="text-blue-600" /> Client Snapshot
              </h4>
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Live</span>
            </div>
            {selectedClientCompanyObj || clientNameInput ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                  {(selectedClientCompanyObj?.name || clientNameInput || 'NA').substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900 truncate text-xs">{selectedClientCompanyObj?.name || clientNameInput}</p>
                  {selectedCompanyMasterObj && <p className="text-[10px] text-blue-700 font-semibold">Group: {selectedCompanyMasterObj.name}</p>}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">Select a company in Step 1...</p>
            )}
            {(selectedManagerName || selectedExecutiveName) && (
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px]">
                {selectedManagerName && <p className="text-slate-600">👤 Manager: <span className="font-bold text-slate-900">{selectedManagerName}</span></p>}
                {selectedExecutiveName && <p className="text-slate-600">👤 Executive: <span className="font-bold text-slate-900">{selectedExecutiveName}</span></p>}
              </div>
            )}
          </div>

          {/* Financial Summary with Inline Editable GST */}
          <div className="card p-4 border border-slate-200 space-y-2.5 text-xs bg-slate-50/90 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                <DollarSign size={12} className="text-emerald-600" /> Financial Summary
              </h4>

              {/* Inline Editable GST Percentage Badge */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500">GST Rate:</span>
                {isEditingGst ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      autoFocus
                      value={gstRate}
                      onChange={e => setGstRate(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      onBlur={() => setIsEditingGst(false)}
                      onKeyDown={e => { if (e.key === 'Enter') setIsEditingGst(false); }}
                      className="w-14 text-xs font-bold text-emerald-800 bg-white border border-emerald-400 rounded px-1 py-0.5 text-right focus:outline-none shadow-sm"
                    />
                    <span className="text-[10px] font-bold text-emerald-800">%</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingGst(true)}
                    className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1"
                    title="Click to edit GST percentage"
                  >
                    <span>{gstRate}%</span>
                    <Edit size={10} className="opacity-70" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-slate-600"><span>Subtotal ({addedServices.length})</span><span className="font-mono font-bold text-slate-900">{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>GST ({gstRate}%)</span><span className="font-mono">{fmt(gstEstimate)}</span></div>
              <div className="flex justify-between p-2.5 bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-950 mt-1">
                <span className="font-bold">Total Due</span>
                <span className="font-mono font-black">{fmt(totalAmountDue)}</span>
              </div>
            </div>
          </div>

          {/* Collapsible Services */}
          {addedServices.length > 0 && (
            <div className="card border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                <h4 className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                  <Tag size={12} className="text-blue-600" /> Services ({addedServices.length})
                </h4>
              </div>
              <div className="divide-y divide-slate-100">
                {addedServices.map(s => {
                  const isExpanded = panelCollapsed[s.id] === true;
                  return (
                    <div key={s.id} className="text-xs">
                      <button
                        type="button"
                        onClick={() => setPanelCollapsed(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left focus:outline-none"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{s.service_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{s.identifier_label}: {s.identifier || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="font-mono font-bold text-slate-800 text-[11px]">{fmt(s.amount_due)}</span>
                          {isExpanded ? <ChevronUp size={13} className="text-slate-400" /> : <ChevronDown size={13} className="text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-3 bg-slate-50/60">
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <span className="text-slate-500">Expiry:</span>
                            <span className="font-bold text-blue-700">{fmtDate(s.expiry_date)}</span>
                            <span className="text-slate-500">Provider:</span>
                            <span className="font-semibold">{s.provider_name}</span>
                            {s.server_name && <><span className="text-slate-500">Server:</span><span className="font-semibold">{s.server_name}</span></>}
                            {s.plan_name && <><span className="text-slate-500">Plan:</span><span className="font-semibold">{s.plan_name}</span></>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Digest Schedule Summary Widget */}
          {addedServices.length > 0 && (
            <div className="card p-4 border border-slate-200 space-y-3 text-xs shadow-sm bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                  <Bell size={12} className="text-violet-600" /> Monthly Digest Schedule
                </h4>
                <span className="text-[9px] font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">Consolidated</span>
              </div>

              {/* Group services by expiry month */}
              {(() => {
                const monthGroups = new Map<string, typeof addedServices>();
                addedServices.forEach(s => {
                  if (!s.expiry_date) return;
                  const monthLabel = dayjs(s.expiry_date).format('MMMM YYYY');
                  if (!monthGroups.has(monthLabel)) monthGroups.set(monthLabel, []);
                  monthGroups.get(monthLabel)!.push(s);
                });

                if (monthGroups.size === 0) {
                  return <p className="text-[11px] text-slate-400 italic">No expiry dates set yet...</p>;
                }

                return (
                  <div className="space-y-3">
                    {Array.from(monthGroups.entries()).map(([monthLabel, services]) => {
                      const earliestExpiry = services.map(s => s.expiry_date).sort()[0];
                      const digestTriggerDate = dayjs(earliestExpiry).subtract(30, 'day').format('DD MMM YYYY');
                      const monthSubtotal = services.reduce((sum, s) => sum + (Number(s.amount_due) || 0), 0);
                      const monthTotalWithGst = monthSubtotal * (1 + gstRate / 100);

                      return (
                        <div key={monthLabel} className="p-3 bg-violet-50/50 border border-violet-200/80 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-violet-950 text-xs">📅 {monthLabel} Digest</span>
                            <span className="text-[10px] font-bold text-violet-700 bg-white px-2 py-0.5 rounded-md border border-violet-200">
                              {services.length} Service{services.length > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px] text-slate-700 border-t border-violet-100 pt-1.5">
                            <p className="flex justify-between">
                              <span className="text-slate-500">Digest Trigger Date:</span>
                              <strong className="text-blue-700">{digestTriggerDate}</strong>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-500">Recipients (TO):</span>
                              <span className="font-semibold text-slate-800">All Company Contacts</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-500">CC Personnel:</span>
                              <span className="font-semibold text-slate-800">Manager & Executive</span>
                            </p>
                            <p className="flex justify-between text-violet-900 font-bold pt-1 border-t border-violet-200/60">
                              <span>Digest Total ({gstRate}% GST):</span>
                              <span className="font-mono">{fmt(monthTotalWithGst)}</span>
                            </p>
                          </div>

                          <div className="pt-1 flex flex-wrap gap-1">
                            {services.map(s => (
                              <span key={s.id} className="text-[9px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 truncate max-w-[150px]">
                                {s.service_name} ({fmt(s.amount_due)})
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Client Company Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><Building size={16} className="text-blue-600" /> Create Client Company</h3>
              <button type="button" onClick={() => setShowAddClientModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Company Name *</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Apex Global Solutions"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddClientModal(false)} className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold">Cancel</button>
              <button
                type="button"
                onClick={() => createClientCompanyMutation.mutate(newClientName)}
                disabled={createClientCompanyMutation.isPending || !newClientName.trim()}
                className="btn btn-primary text-xs py-2 px-5 font-bold shadow-md"
              >
                {createClientCompanyMutation.isPending ? 'Saving...' : 'Create Client Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><UserPlus size={16} className="text-blue-600" /> Add Contact Person</h3>
              <button type="button" onClick={() => setShowAddContactModal(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Company</label>
                <input type="text" readOnly value={clientNameInput || 'Client Company'} className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Name *</label>
                <input type="text" placeholder="e.g. Contact Name" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation</label>
                <input type="text" placeholder="e.g. IT Manager / Director" value={newContactDesignation} onChange={e => setNewContactDesignation(e.target.value)} className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input type="email" placeholder="email@company.com" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone / Mobile</label>
                  <input type="text" placeholder="+91 98765..." value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button type="button" onClick={() => setShowAddContactModal(false)} className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold">Cancel</button>
              <button
                type="button"
                onClick={() => createContactMutation.mutate({
                  name: newContactName,
                  email: newContactEmail,
                  mobile: newContactPhone,
                  designation: newContactDesignation,
                })}
                disabled={createContactMutation.isPending || !newContactName.trim() || !clientNameInput}
                className="btn btn-primary text-xs py-2 px-5 font-bold shadow-md"
              >
                {createContactMutation.isPending ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
