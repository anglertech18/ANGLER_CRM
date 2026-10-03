import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Database,
    Edit,
    Plus,
    Trash2,
} from 'lucide-react';

import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

import MasterForm from './MasterForm';
import CompanyForm from './CompanyForm';
import SBUForm from './SBUForm';
import StateForm from './StateForm';
import CityForm from './CityForm';
import PersonaForm from './PersonaForm';
import ProductForm from './ProductForm';
import ServiceForm from './ServiceForm';
import EitServiceForm from './EitServiceForm';
import ImServiceForm from './ImServiceForm';
import RenewalMasterForm from './RenewalMasterForm';
import RenewalServiceForm from './RenewalServiceForm';

// Maps Renewal master types to their dedicated API routes.
const RENEWAL_API_MAP: Record<string, string> = {
    renewalcategory: '/renewal-masters/categories',
    renewalsubcategory: '/renewal-masters/sub-categories',
    renewalservice: '/renewal-masters/services',
    renewalprovider: '/renewal-masters/providers',
};

export default function MasterList() {
    const { type } = useParams<{ type: string }>();
    const queryClient = useQueryClient();
    const { hasPrivilege } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const renewalApiPath = type ? RENEWAL_API_MAP[type] : null;
    const apiPath = renewalApiPath || `/masters/${type}`;
    const privilegeModule = renewalApiPath ? 'RenewalMasters' : 'Masters';
    const canAdd = hasPrivilege(privilegeModule, 'can_add');
    const canEdit = hasPrivilege(privilegeModule, 'can_edit');
    const canDelete = hasPrivilege(privilegeModule, 'can_delete');

    const {
        data: items,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ['masters', type],
        queryFn: async () => {
            const response = await api.get(apiPath);
            return response.data;
        },
        enabled: Boolean(type),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => {
            const deletePath = renewalApiPath
                ? `${renewalApiPath}/${id}`
                : `/masters/${type}/${id}`;

            return api.delete(deletePath);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['masters', type],
            });
        },
    });

    const handleDelete = (id: number) => {
        const isConfirmed = window.confirm(
            'Are you sure you want to delete this item?',
        );

        if (isConfirmed) {
            deleteMutation.mutate(id);
        }
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const titleMap: Record<string, string> = {
        company: 'Company',
        clientcompany: 'Client Company',
        vertical: 'Vertical',
        paymenttype: 'Payment Type',
        sbu: 'SBU',
        jobtitle: 'Job Title',
        leadsource: 'Lead Source',
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
        renewalcategory: 'Renewal Service Category',
        renewalsubcategory: 'Renewal Service Sub-Category',
        renewalservice: 'Renewal Service',
        renewalprovider: 'Renewal Provider',
    };

    const title =
        (type && titleMap[type]) ||
        type?.replace(/([A-Z])/g, ' $1').trim() ||
        '';

    useEffect(() => {
        setPage(1);
    }, [type]);

    const normalizedItems = Array.isArray(items) ? items : [];
    const totalCount = normalizedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);

    const pagedItems = normalizedItems.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );

    const columns: TableColumn<any>[] = [
        {
            key: 'id',
            header: 'ID',
            width: 'w-16',
            render: (item) => (
                <span className="text-slate-400">
                    {item.id}
                </span>
            ),
        },
        {
            key: 'name',
            header: 'Name',
            render: (item) => (
                <span className="font-medium text-slate-800">
                    {item.name}
                </span>
            ),
        },

        ...(type === 'sbu'
            ? [
                {
                    key: 'company',
                    header: 'Company',
                    render: (item: any) => (
                        <span className="text-slate-500">
                            {item.company?.name || '—'}
                        </span>
                    ),
                },
            ]
            : []),

        ...(type === 'state'
            ? [
                {
                    key: 'country',
                    header: 'Country',
                    render: (item: any) => (
                        <span className="text-slate-500">
                            {item.country?.name || '—'}
                        </span>
                    ),
                },
            ]
            : []),

        ...(type === 'city'
            ? [
                {
                    key: 'state',
                    header: 'State',
                    render: (item: any) => (
                        <span className="text-slate-500">
                            {item.state?.name || '—'}
                        </span>
                    ),
                },
            ]
            : []),

        ...(type === 'persona'
            ? [
                {
                    key: 'personaType',
                    header: 'Type',
                    render: (item: any) => (
                        <span className="text-slate-500">
                            {item.product_or_service || 'Product'}
                        </span>
                    ),
                },
                {
                    key: 'mappedItem',
                    header: 'Mapped Item',
                    render: (item: any) => (
                        <span className="text-slate-500">
                            {item.product?.name ||
                                item.eitService?.name ||
                                item.imService?.name ||
                                '—'}
                        </span>
                    ),
                },
            ]
            : []),

        ...(type === 'product'
            ? [
                {
                    key: 'productCompany',
                    header: 'Company',
                    render: (item: any) => (
                        <span className="text-slate-500">
                            {item.company?.name || '—'}
                        </span>
                    ),
                },
            ]
            : []),

        ...(
            ['product', 'service', 'eitservice', 'imservice'].includes(
                type || '',
            )
                ? [
                    {
                        key: 'count_type',
                        header: 'Count Type',
                        render: (item: any) => (
                            <span className="text-slate-500">
                                {item.count_type || '—'}
                            </span>
                        ),
                    },
                ]
                : []
        ),

        ...(type === 'company'
            ? [
                {
                    key: 'report_recipient_email',
                    header: 'Daily Report Recipient',
                    render: (item: any) => (
                        <span className="text-slate-500">
                            {item.report_recipient_email || '—'}
                        </span>
                    ),
                },
            ]
            : []),

        ...(type === 'renewalservice'
            ? [
                {
                    key: 'category',
                    header: 'Category',
                    render: (item: any) => (
                        <span className="text-slate-500">
                            {item.category?.name || '—'}
                        </span>
                    ),
                },
                {
                    key: 'duration',
                    header: 'Duration',
                    render: (item: any) => {
                        if (!item.default_duration_value) {
                            return (
                                <span className="text-slate-500">
                                    —
                                </span>
                            );
                        }

                        const duration = [
                            item.default_duration_value,
                            item.default_duration_unit,
                        ]
                            .filter(Boolean)
                            .join(' ');

                        return (
                            <span className="text-slate-500">
                                {duration}
                            </span>
                        );
                    },
                },
            ]
            : []),

        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="btn btn-ghost btn-sm btn-icon text-primary-600"
                            title="Edit"
                        >
                            <Edit size={14} />
                        </button>
                    )}

                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="btn btn-ghost btn-sm btn-icon text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    if (isLoading) {
        return (
            <div className="page-wrapper">
                <div className="flex items-center gap-3 mb-6">
                    <div className="skeleton w-8 h-8 rounded-lg" />
                    <div className="skeleton h-5 w-40 rounded" />
                </div>

                <div className="card overflow-hidden">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className="flex gap-4 px-4 py-3.5 border-b border-slate-50"
                        >
                            <div className="skeleton h-3 w-8 rounded" />
                            <div className="skeleton h-3 w-48 rounded" />
                            <div className="skeleton h-3 w-24 rounded ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="page-wrapper">
                <div className="card p-4 flex items-center gap-3 text-red-600 border-red-200">
                    <AlertCircle size={16} />

                    <span className="text-sm font-medium">
                        {(error as any)?.response?.data?.message ||
                            (error as any)?.message ||
                            'Unable to load master records.'}
                    </span>
                </div>
            </div>
        );
    }

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
                            <Database
                                size={14}
                                className="text-primary-600"
                            />
                        </div>

                        <h1 className="page-title capitalize">
                            {title} Master
                        </h1>
                    </div>
                </div>

                {canAdd && (
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="btn btn-primary"
                    >
                        <Plus size={15} />
                        Add New
                    </button>
                )}
            </div>

            <div className="card overflow-hidden">
                <div className="flex items-center justify-end gap-1.5 px-4 py-2.5 border-b border-slate-100">
                    <span className="text-xs text-slate-400">
                        Rows:
                    </span>

                    <select
                        value={pageSize}
                        onChange={(event) => {
                            setPageSize(Number(event.target.value));
                            setPage(1);
                        }}
                        className="form-select py-1 text-xs"
                        style={{ width: 64 }}
                    >
                        {[10, 20, 50, 100].map((size) => (
                            <option
                                key={size}
                                value={size}
                            >
                                {size}
                            </option>
                        ))}
                    </select>
                </div>

                <Table
                    columns={columns}
                    data={pagedItems}
                    getRowKey={(item) => item.id}
                    maxHeight="max-h-[65vh]"
                    emptyIcon={
                        <Database
                            size={16}
                            className="text-slate-400"
                        />
                    }
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
                type === 'company'
                    ? (
                        <CompanyForm
                            initialData={editingItem}
                            onClose={closeModal}
                        />
                    )
                    : type === 'sbu'
                        ? (
                            <SBUForm
                                initialData={editingItem}
                                onClose={closeModal}
                            />
                        )
                        : type === 'state'
                            ? (
                                <StateForm
                                    initialData={editingItem}
                                    onClose={closeModal}
                                />
                            )
                            : type === 'city'
                                ? (
                                    <CityForm
                                        initialData={editingItem}
                                        onClose={closeModal}
                                    />
                                )
                                : type === 'persona'
                                    ? (
                                        <PersonaForm
                                            initialData={editingItem}
                                            onClose={closeModal}
                                        />
                                    )
                                    : type === 'product'
                                        ? (
                                            <ProductForm
                                                initialData={editingItem}
                                                onClose={closeModal}
                                            />
                                        )
                                        : type === 'service'
                                            ? (
                                                <ServiceForm
                                                    initialData={editingItem}
                                                    onClose={closeModal}
                                                />
                                            )
                                            : type === 'eitservice'
                                                ? (
                                                    <EitServiceForm
                                                        initialData={editingItem}
                                                        onClose={closeModal}
                                                    />
                                                )
                                                : type === 'imservice'
                                                    ? (
                                                        <ImServiceForm
                                                            initialData={editingItem}
                                                            onClose={closeModal}
                                                        />
                                                    )
                                                    : type === 'renewalservice'
                                                        ? (
                                                            <RenewalServiceForm
                                                                initialData={editingItem}
                                                                onClose={closeModal}
                                                            />
                                                        )
                                                        : renewalApiPath
                                                            ? (
                                                                <RenewalMasterForm
                                                                    type={type!}
                                                                    initialData={editingItem}
                                                                    onClose={closeModal}
                                                                />
                                                            )
                                                        : (
                                                            <MasterForm
                                                                type={type!}
                                                                initialData={editingItem}
                                                                onClose={closeModal}
                                                            />
                                                        )
            )}
        </div>
    );
}
