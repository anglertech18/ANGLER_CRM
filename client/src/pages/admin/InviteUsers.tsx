import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Plus, XCircle, RefreshCw, CheckCircle, Eye, Edit, Power, Shield, Trash2,
    Search, Users as UsersIcon, UserCheck, UserX, Clock, X,
} from 'lucide-react';
import clsx from 'clsx';
import UserForm from './UserForm';
import { useAuth } from '../../context/AuthContext';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

const ROLES = ['CEO', 'SalesManager', 'SalesPerson'];

function initialsOf(user: any) {
    const a = (user.first_name || '').charAt(0);
    const b = (user.last_name || '').charAt(0);
    return (a + b).toUpperCase() || '?';
}

const AVATAR_COLORS = [
    'bg-primary-100 text-primary-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
];
function avatarColor(id: number) {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function InviteUsers() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL_ACTIVE'); // ALL_ACTIVE | ACTIVE | INVITED | INACTIVE | ALL
    const [roleFilter, setRoleFilter] = useState('');
    const [companyFilter, setCompanyFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'CEO';

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        },
    });

    const { data: companies } = useQuery({
        queryKey: ['masters', 'company'],
        queryFn: () => api.get('/masters/company').then(r => r.data),
    });

    const resendInviteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.post(`/users/${id}/resend-invite`);
        },
        onSuccess: () => {
            alert('Invitation resent successfully.');
        },
        onError: (error: any) => {
            alert('Failed to resend invite: ' + (error.response?.data?.message || error.message));
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.patch(`/users/${id}/toggle-status`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: any) => {
            alert('Failed to update status: ' + (error.response?.data?.message || error.message));
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            alert('User deleted successfully (deactivated)');
        },
        onError: (error: any) => {
            alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
        }
    });

    const handleResend = (id: number) => {
        if (window.confirm('Resend invitation email to this user?')) {
            resendInviteMutation.mutate(id);
        }
    };

    const handleToggleStatus = (user: any) => {
        const action = user.status === 'ACTIVE' ? 'deactivate' : 'activate';
        if (window.confirm(`Are you sure you want to ${action} this user?`)) {
            toggleStatusMutation.mutate(user.id);
        }
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.')) {
            deleteUserMutation.mutate(id);
        }
    };

    const handleInvite = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return <span className="badge-emerald"><CheckCircle size={11} /> Active</span>;
            case 'INACTIVE':
                return <span className="badge-red"><XCircle size={11} /> Inactive</span>;
            case 'INVITED':
            default:
                return <span className="badge-amber"><Clock size={11} /> Pending</span>;
        }
    };

    useEffect(() => { setPage(1); }, [search, statusFilter, roleFilter, companyFilter]);

    const stats = useMemo(() => {
        const list = users || [];
        return {
            total: list.length,
            active: list.filter((u: any) => u.status === 'ACTIVE').length,
            invited: list.filter((u: any) => u.status === 'INVITED').length,
            inactive: list.filter((u: any) => u.status === 'INACTIVE').length,
        };
    }, [users]);

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (users || []).filter((u: any) => {
            if (statusFilter === 'ALL_ACTIVE' && u.status === 'INACTIVE') return false;
            if (statusFilter !== 'ALL' && statusFilter !== 'ALL_ACTIVE' && u.status !== statusFilter) return false;
            if (roleFilter && u.role !== roleFilter) return false;
            if (companyFilter && String(u.company_id ?? u.company?.id ?? '') !== companyFilter) return false;
            if (q) {
                const hay = `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [users, search, statusFilter, roleFilter, companyFilter]);

    const totalCount = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

    const hasFilters = !!search || statusFilter !== 'ALL_ACTIVE' || !!roleFilter || !!companyFilter;
    const resetFilters = () => { setSearch(''); setStatusFilter('ALL_ACTIVE'); setRoleFilter(''); setCompanyFilter(''); };

    const columns: TableColumn<any>[] = [
        {
            key: 'name', header: 'Name', headerAlign: 'center', render: user => (
                <button
                    type="button"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    className="flex items-center gap-3 text-left group"
                    title="View Details"
                >
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(user.id))}>
                        {initialsOf(user)}
                    </div>
                    <div className="min-w-0">
                        <div className="font-medium text-slate-800 truncate group-hover:text-primary-600">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-slate-400 truncate">{user.email}</div>
                    </div>
                </button>
            ),
        },
        { key: 'role', header: 'Role', headerAlign: 'center', render: user => <span className="badge-indigo">{user.role}</span> },
        { key: 'company', header: 'Company', headerAlign: 'center', render: user => <span className="text-slate-500">{user.company?.name || '—'}</span> },
        { key: 'sbu', header: 'SBU', headerAlign: 'center', render: user => <span className="text-slate-500">{user.sbu?.name || '—'}</span> },
        {
            key: 'reporting_manager', header: 'Reporting Manager', headerAlign: 'center', render: user => (
                <span className="text-slate-500">{user.reporting_manager ? `${user.reporting_manager.first_name} ${user.reporting_manager.last_name}` : '—'}</span>
            ),
        },
        {
            key: 'joining_date', header: 'Invited On', headerAlign: 'center', render: user => (
                <span className="text-slate-500">{user.joining_date ? new Date(user.joining_date).toLocaleDateString() : 'N/A'}</span>
            ),
        },
        { key: 'status', header: 'Status', align: 'center', render: user => getStatusBadge(user.status) },
        {
            key: 'actions', header: 'Actions', align: 'right', headerAlign: 'center', width: 'w-40', render: user => (
                <div className="flex justify-end gap-1">
                    {user.status === 'INVITED' && (
                        <button
                            onClick={() => handleResend(user.id)}
                            className="btn btn-ghost btn-sm btn-icon text-primary-600"
                            title="Resend Invite"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                    <button onClick={() => navigate(`/admin/users/${user.id}`)} className="btn btn-ghost btn-sm btn-icon text-slate-500" title="View Details">
                        <Eye size={14} />
                    </button>
                    <button onClick={() => handleEdit(user)} className="btn btn-ghost btn-sm btn-icon text-indigo-600" title="Edit">
                        <Edit size={14} />
                    </button>
                    <button
                        onClick={() => handleToggleStatus(user)}
                        className={clsx('btn btn-ghost btn-sm btn-icon', user.status === 'ACTIVE' ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50')}
                        title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    >
                        <Power size={14} />
                    </button>
                    {isAdmin && (
                        <button onClick={() => navigate(`/admin/privileges/${user.id}`)} className="btn btn-ghost btn-sm btn-icon text-primary-600" title="Manage Privileges">
                            <Shield size={14} />
                        </button>
                    )}
                    <button onClick={() => handleDelete(user.id)} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete User">
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <UsersIcon size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Invite Users / User List</h1>
                        <p className="page-subtitle">Manage user invitations, access, and status</p>
                    </div>
                </div>
                <button onClick={handleInvite} className="btn btn-primary">
                    <Plus size={16} />
                    Invite User
                </button>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Users', value: stats.total, icon: UsersIcon, tone: 'bg-slate-100 text-slate-600' },
                    { label: 'Active', value: stats.active, icon: UserCheck, tone: 'bg-emerald-100 text-emerald-600' },
                    { label: 'Pending Invites', value: stats.invited, icon: Clock, tone: 'bg-amber-100 text-amber-600' },
                    { label: 'Inactive', value: stats.inactive, icon: UserX, tone: 'bg-red-100 text-red-600' },
                ].map(s => (
                    <div key={s.label} className="card p-4 flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.tone)}>
                            <s.icon size={17} />
                        </div>
                        <div className="min-w-0">
                            <div className="stat-value-sm">{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="filter-bar flex-nowrap overflow-x-auto">
                <div className="relative flex-1 min-w-[180px] shrink-0">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        className="form-input pl-9 text-sm"
                    />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select text-sm w-[9.5rem] shrink-0">
                    <option value="ALL_ACTIVE">Active + Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INVITED">Pending</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ALL">All Statuses</option>
                </select>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="form-select text-sm w-[8.5rem] shrink-0">
                    <option value="">All Roles</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="form-select text-sm w-[9rem] shrink-0">
                    <option value="">All Companies</option>
                    {(companies ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {hasFilters && (
                    <button type="button" onClick={resetFilters} className="btn btn-ghost btn-sm shrink-0">
                        <X size={13} /> Clear
                    </button>
                )}
            </div>

            <div className="card overflow-hidden">
                <Table
                    columns={columns}
                    data={pagedUsers}
                    getRowKey={user => user.id}
                    isLoading={isLoading}
                    maxHeight="max-h-[65vh]"
                    emptyIcon={<UsersIcon size={20} className="text-slate-400" />}
                    emptyTitle="No users found"
                    emptySubtitle="Try adjusting the filters above."
                />
                <TablePagination
                    page={safePage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    isLoading={isLoading}
                    itemLabel="users"
                />
            </div>

            {isModalOpen && (
                <UserForm
                    initialData={editingUser}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
}
