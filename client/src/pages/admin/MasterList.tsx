import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Edit, Trash2, ArrowLeft, Database, AlertCircle } from 'lucide-react';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';
import MasterForm from './MasterForm';
import CompanyForm from './CompanyForm';
import SBUForm from './SBUForm';
import StateForm from './StateForm';
import CityForm from './CityForm';
import LeadSourceForm from './LeadSourceForm';
import PersonaForm from './PersonaForm';
import ProductForm from './ProductForm';
import ServiceForm from './ServiceForm';
import EitServiceForm from './EitServiceForm';
import ImServiceForm from './ImServiceForm';

export default function MasterList() {
    const { type } = useParams<{ type: string }>();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data: items, isLoading, isError, error } = useQuery({
        queryKey: ['masters', type],
        queryFn: () => api.get(`/masters/${type}`).then(r => r.data),
        enabled: !!type,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/masters/${type}/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['masters', type] }),
    });

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (item: any) => { setEditingItem(item); setIsModalOpen(true); };
    const handleAdd  = ()          => { setEditingItem(null);  setIsModalOpen(true); };

    const titleMap: Record<string, string> = {
        company: 'Company',
        clientcompany: 'Client Company',
        vertical: 'Vertical',
        paymenttype: 'Payment Type',
        sbu: 'SBU',
        jobtitle: 'Job Title',
        leadsource: 'Lead Source',
        leadsourcetype: 'Lead Source Type',
        industry: 'Industry',
        country: 'Country',
        state: 'State',
        city: 'City',
        product: 'Product',
        persona: 'Persona',
        avatar: 'Avatar',
        collateral: 'Collateral',
        salesstage: 'Sales Stage',
        activity: 'Activity',
        department: 'Department',
        sourceofdb: 'Source of DB',
        callstatus: 'Call Status',
        emailstatus: 'Email Status',
    };
    const title = (type && titleMap[type]) ?? type?.replace(/([A-Z])/g, ' $1').trim() ?? '';

    useEffect(() => { setPage(1); }, [type]);

    const totalCount = items?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedItems = (items || []).slice((safePage - 1) * pageSize, safePage * pageSize);

    const columns: TableColumn<any>[] = [
        { key: 'id', header: 'ID', render: item => <span className="text-slate-400">{item.id}</span>, width: 'w-16' },
        { key: 'name', header: 'Name', render: item => <span className="font-medium text-slate-800">{item.name}</span> },
        ...(type === 'sbu' ? [{ key: 'company', header: 'Company', render: (item: any) => <span className="text-slate-500">{item.company?.name || '—'}</span> }] : []),
        ...(type === 'state' ? [{ key: 'country', header: 'Country', render: (item: any) => <span className="text-slate-500">{item.country?.name || '—'}</span> }] : []),
        ...(type === 'city' ? [{ key: 'state', header: 'State', render: (item: any) => <span className="text-slate-500">{item.state?.name || '—'}</span> }] : []),
        ...(type === 'leadsource' ? [{ key: 'lead_source_type', header: 'Lead Source Type', render: (item: any) => <span className="text-slate-500">{item.lead_source_type?.name || '—'}</span> }] : []),
        ...(type === 'persona' ? [
            { key: 'personaType', header: 'Type', render: (item: any) => <span className="text-slate-500">{item.product_or_service || 'Product'}</span> },
            { key: 'mappedItem', header: 'Mapped Item', render: (item: any) => <span className="text-slate-500">{item.product?.name || item.eitService?.name || item.imService?.name || '—'}</span> },
        ] : []),
        ...(type === 'product' ? [{ key: 'productCompany', header: 'Company', render: (item: any) => <span className="text-slate-500">{item.company?.name || '—'}</span> }] : []),
        ...(['product', 'service', 'eitservice', 'imservice'].includes(type || '') ? [
            { key: 'count_type', header: 'Count Type', render: (item: any) => <span className="text-slate-500">{item.count_type || '—'}</span> },
        ] : []),
        ...(type === 'company' ? [{ key: 'report_recipient_email', header: 'Daily Report Recipient', render: (item: any) => <span className="text-slate-500">{item.report_recipient_email || '—'}</span> }] : []),
        {
            key: 'actions', header: 'Actions', align: 'right', render: item => (
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(item)} className="btn btn-ghost btn-sm btn-icon text-primary-600" title="Edit">
                        <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ];

    if (isLoading) return (
        <div className="page-wrapper">
            <div className="flex items-center gap-3 mb-6">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="skeleton h-5 w-40 rounded" />
            </div>
            <div className="card overflow-hidden">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-slate-50">
                        <div className="skeleton h-3 w-8 rounded" />
                        <div className="skeleton h-3 w-48 rounded" />
                        <div className="skeleton h-3 w-24 rounded ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    );

    if (isError) return (
        <div className="page-wrapper">
            <div className="card p-4 flex items-center gap-3 text-red-600 border-red-200">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">
                    {(error as any)?.response?.data?.message || (error as any)?.message}
                </span>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/masters"
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Database size={14} className="text-primary-600" />
                        </div>
                        <h1 className="page-title capitalize">{title} Master</h1>
                    </div>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <Plus size={15} />
                    Add New
                </button>
            </div>

            <div className="card overflow-hidden">
                <div className="flex items-center justify-end gap-1.5 px-4 py-2.5 border-b border-slate-100">
                    <span className="text-xs text-slate-400">Rows:</span>
                    <select
                        value={pageSize}
                        onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="form-select py-1 text-xs"
                        style={{ width: 64 }}
                    >
                        {[10, 20, 50, 100].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <Table
                    columns={columns}
                    data={pagedItems}
                    getRowKey={item => item.id}
                    maxHeight="max-h-[65vh]"
                    emptyIcon={<Database size={16} className="text-slate-400" />}
                    emptyTitle="No records found"
                    emptySubtitle='Click "Add New" to create the first entry.'
                />
                <TablePagination
                    page={safePage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    itemLabel="records"
                />
            </div>

            {isModalOpen && (
                type === 'company'    ? <CompanyForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'sbu'        ? <SBUForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'state'      ? <StateForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'city'       ? <CityForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'leadsource' ? <LeadSourceForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'persona'    ? <PersonaForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'product'    ? <ProductForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'service'    ? <ServiceForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'eitservice' ? <EitServiceForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                type === 'imservice'  ? <ImServiceForm initialData={editingItem} onClose={() => setIsModalOpen(false)} /> :
                <MasterForm type={type!} initialData={editingItem} onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
}
