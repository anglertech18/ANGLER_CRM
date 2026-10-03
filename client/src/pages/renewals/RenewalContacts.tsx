import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, X, Users, Mail, Phone, Building2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DataTableHeaderFilter from '../../components/DataTableHeaderFilter';

const ROLE_COLORS: Record<string, string> = {
  PRIMARY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  BILLING: 'bg-amber-50 text-amber-700 border-amber-200',
  TECHNICAL: 'bg-sky-50 text-sky-700 border-sky-200',
  DECISION_MAKER: 'bg-purple-50 text-purple-700 border-purple-200',
};

const ROLES = [
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'DECISION_MAKER', label: 'Decision Maker' },
];

export default function RenewalContacts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // DataTables Sorting & Column Filters State
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  // Form State
  const [form, setForm] = useState({
    name: '',
    designation: '',
    department: '',
    email: '',
    mobile: '',
    whatsapp: '',
    role: 'PRIMARY',
    address: '',
    city_pincode: '',
    state: '',
    gstin: '',
    is_primary: false,
    email_consent: true,
    phone_consent: true,
    whatsapp_consent: false,
    use_default_template: false,
    client_company_id: '',
  });

  // Query: contacts
  const { data, isLoading } = useQuery({
    queryKey: ['renewal-contacts', { search, role: roleFilter, page }],
    queryFn: () =>
      api
        .get('/renewal-masters/contacts', {
          params: {
            search: search || undefined,
            role: roleFilter || undefined,
            page: 1,
            limit: 250, // Fetch broader set for DataTables filtering
          },
        })
        .then((r) => r.data),
    staleTime: 15_000,
  });

  const rawContacts: any[] = data?.data ?? (Array.isArray(data) ? data : []);

  // Query: client companies for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['masters', 'clientcompany'],
    queryFn: () => api.get('/masters/clientcompany').then((r) => r.data),
  });

  // ── Unique Column Values Extractor ──────────────────────────────────────────
  const uniqueOptions = useMemo(() => {
    const names = new Set<string>();
    const companies = new Set<string>();
    const emails = new Set<string>();
    const phones = new Set<string>();
    const roles = new Set<string>();
    const cities = new Set<string>();

    rawContacts.forEach(c => {
      if (c.name) names.add(c.name);
      if (c.client_company?.name) companies.add(c.client_company.name);
      if (c.email) emails.add(c.email);
      if (c.mobile) phones.add(c.mobile);
      if (c.role) roles.add(c.role);
      if (c.city_pincode) cities.add(c.city_pincode);
    });

    return {
      name: Array.from(names).sort(),
      company: Array.from(companies).sort(),
      email: Array.from(emails).sort(),
      phone: Array.from(phones).sort(),
      role: Array.from(roles).sort(),
      city: Array.from(cities).sort(),
    };
  }, [rawContacts]);

  // ── Data Filter & Sort Pipeline ───────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    let result = [...rawContacts];

    // Apply Column Filters
    for (const [colKey, allowedSet] of Object.entries(columnFilters)) {
      if (allowedSet && allowedSet.size > 0) {
        result = result.filter(item => {
          let val = '';
          if (colKey === 'name') val = item.name || '';
          else if (colKey === 'company') val = item.client_company?.name || '';
          else if (colKey === 'email') val = item.email || '';
          else if (colKey === 'phone') val = item.mobile || '';
          else if (colKey === 'role') val = item.role || '';
          else if (colKey === 'city') val = item.city_pincode || '';
          return allowedSet.has(val);
        });
      }
    }

    // Apply Sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortField === 'name') { valA = a.name || ''; valB = b.name || ''; }
        else if (sortField === 'company') { valA = a.client_company?.name || ''; valB = b.client_company?.name || ''; }
        else if (sortField === 'email') { valA = a.email || ''; valB = b.email || ''; }
        else if (sortField === 'role') { valA = a.role || ''; valB = b.role || ''; }

        const cmp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [rawContacts, columnFilters, sortField, sortOrder]);

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newContact: typeof form) =>
      api.post('/renewal-masters/contacts', newContact),
    onSuccess: () => {
      toast.success('Contact created successfully');
      setIsDrawerOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ['renewal-contacts'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create contact');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; data: typeof form }) =>
      api.put(`/renewal-masters/contacts/${payload.id}`, payload.data),
    onSuccess: () => {
      toast.success('Contact updated successfully');
      setIsDrawerOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ['renewal-contacts'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to update contact');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/renewal-masters/contacts/${id}`),
    onSuccess: () => {
      toast.success('Contact deleted successfully');
      qc.invalidateQueries({ queryKey: ['renewal-contacts'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to delete contact');
    },
  });

  const resetForm = () => {
    setForm({
      name: '',
      designation: '',
      department: '',
      email: '',
      mobile: '',
      whatsapp: '',
      role: 'PRIMARY',
      address: '',
      city_pincode: '',
      state: '',
      gstin: '',
      is_primary: false,
      email_consent: true,
      phone_consent: true,
      whatsapp_consent: false,
      use_default_template: false,
      client_company_id: '',
    });
    setEditingContact(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDrawerOpen(true);
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setForm({
      name: contact.name ?? '',
      designation: contact.designation ?? '',
      department: contact.department ?? '',
      email: contact.email ?? '',
      mobile: contact.mobile ?? '',
      whatsapp: contact.whatsapp ?? '',
      role: contact.role ?? 'PRIMARY',
      address: contact.address ?? '',
      city_pincode: contact.city_pincode ?? '',
      state: contact.state ?? '',
      gstin: contact.gstin ?? '',
      is_primary: contact.is_primary ?? false,
      email_consent: contact.email_consent ?? true,
      phone_consent: contact.phone_consent ?? true,
      whatsapp_consent: contact.whatsapp_consent ?? false,
      use_default_template: contact.use_default_template ?? false,
      client_company_id: String(contact.client_company_id ?? ''),
    });
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Contact name is required');
      return;
    }
    if (!form.client_company_id) {
      toast.error('Client company is required');
      return;
    }

    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="page-wrapper space-y-5">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600 shrink-0" />
            <span className="truncate">Client Contacts Directory</span>
          </h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Manage company contacts, consent options, location addresses, and notification preferences.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary text-[12px] flex items-center gap-1.5 shadow-md py-2 px-4 rounded-lg font-bold shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {/* Top Search & Filter Bar */}
      <div className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(240px,420px)_160px] gap-3 w-full lg:flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts by name, email, company..."
              className="form-input pl-9 text-[12px] rounded-lg py-2"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="form-select text-[12px] rounded-lg py-2"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between lg:justify-end gap-2 w-full lg:w-auto">
          {(search || roleFilter || Object.keys(columnFilters).length > 0) && (
            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setColumnFilters({}); }}
              className="btn btn-ghost text-xs py-1.5 px-3 rounded-lg border border-slate-300 font-bold"
            >
              Clear Filters
            </button>
          )}
          <span className="text-xs font-bold text-slate-500">
            Total: {filteredContacts.length} contacts
          </span>
        </div>
      </div>

      {/* Data Table with DataTables Header Filters */}
      <div className="card overflow-hidden border border-slate-200 shadow-sm rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] table-fixed text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <DataTableHeaderFilter
                  title="Contact Name"
                  field="name"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  allValues={uniqueOptions.name}
                  selectedValues={columnFilters['name'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, name: set }))}
                  className="w-[220px]"
                />
                <DataTableHeaderFilter
                  title="Client Company"
                  field="company"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  allValues={uniqueOptions.company}
                  selectedValues={columnFilters['company'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, company: set }))}
                  className="w-[210px]"
                />
                <DataTableHeaderFilter
                  title="Email"
                  field="email"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  allValues={uniqueOptions.email}
                  selectedValues={columnFilters['email'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, email: set }))}
                  className="w-[230px]"
                />
                <DataTableHeaderFilter
                  title="Phone / Mobile"
                  field="phone"
                  allValues={uniqueOptions.phone}
                  selectedValues={columnFilters['phone'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, phone: set }))}
                  className="w-[160px]"
                />
                <DataTableHeaderFilter
                  title="Location / City"
                  field="city"
                  allValues={uniqueOptions.city}
                  selectedValues={columnFilters['city'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, city: set }))}
                  className="w-[170px]"
                />
                <DataTableHeaderFilter
                  title="Role"
                  field="role"
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  allValues={uniqueOptions.role}
                  selectedValues={columnFilters['role'] || new Set()}
                  onFilterChange={set => setColumnFilters(p => ({ ...p, role: set }))}
                  className="w-[150px]"
                />
                <th className="p-3 w-[110px] text-[10px] uppercase font-bold tracking-wider text-slate-700 bg-slate-100 border-b border-slate-300 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <div className="mx-auto max-w-sm">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600">No client contacts found</p>
                      <p className="text-xs text-slate-400 mt-1">Add contacts manually or import renewal data to populate this directory.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <span className="truncate">{c.name}</span>
                            {c.is_primary && <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-full">Primary</span>}
                          </p>
                          {c.designation && (
                            <p className="text-[10px] text-slate-500 truncate">{c.designation}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-middle font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{c.client_company?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="p-3 align-middle text-slate-600 font-mono text-[11px]">
                      {c.email ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.email}</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 text-[10px] font-bold">⚠️ No Email</span>
                      )}
                    </td>
                    <td className="p-3 align-middle text-slate-600 font-mono text-[11px]">
                      {c.mobile ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{c.mobile}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 align-middle text-slate-600 text-[11px]">
                      {c.city_pincode || c.address ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.city_pincode || c.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 align-middle">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          ROLE_COLORS[c.role] || 'bg-slate-100 text-slate-600 border-slate-200'
                        )}
                      >
                        {c.role || 'PRIMARY'}
                      </span>
                    </td>
                    <td className="p-3 align-middle text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Contact"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to deactivate ${c.name}?`)) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate Contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Drawer Form (Full Field Support) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right">
            <div>
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  {editingContact ? 'Edit Contact Details' : 'Create New Client Contact'}
                </h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form id="contact-form" onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Company *</label>
                  <select
                    value={form.client_company_id}
                    onChange={(e) => setForm({ ...form, client_company_id: e.target.value })}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Select Client Company --</option>
                    {clients.map((cc: any) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Ramesh Sundaram"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation</label>
                    <input
                      type="text"
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="CTO / IT Director"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="IT Infrastructure"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="ramesh@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                {/* Location & Address Fields */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Location & Office Address</p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Registered Address</label>
                    <textarea
                      rows={2}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2"
                      placeholder="Street address, building, suite..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">City & Pincode</label>
                      <input
                        type="text"
                        value={form.city_pincode}
                        onChange={(e) => setForm({ ...form, city_pincode: e.target.value })}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="Coimbatore - 641 045"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={form.gstin}
                        onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                        className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 font-mono uppercase"
                        placeholder="33AAAAA0000A1Z5"
                      />
                    </div>
                  </div>
                </div>

                {/* Role & Consents */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Role & Notification Consents</p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_primary}
                        onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-xs font-bold text-slate-800">Primary Contact for Order Form & Invoices</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.email_consent}
                        onChange={(e) => setForm({ ...form, email_consent: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-xs font-semibold text-slate-700">Email Digest Consent</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.phone_consent}
                        onChange={(e) => setForm({ ...form, phone_consent: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span className="text-xs font-semibold text-slate-700">Phone Call Reminder Consent</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="btn btn-ghost text-xs py-2 px-4 border border-slate-300 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="contact-form"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn btn-primary text-xs py-2 px-5 font-bold shadow-md rounded-xl"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingContact ? 'Update Contact' : 'Save Contact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
