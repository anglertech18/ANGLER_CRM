import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Eye, Edit2, Target, Search, X, Users as UsersIcon } from 'lucide-react';
import clsx from 'clsx';
import ViewUserModal from './ViewUserModal';
import EditUserPerformanceModal from './EditUserPerformanceModal';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

interface CurrentUser {
    id: number;
    role: string;
}

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

export default function UserManagement() {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'view' | 'edit' | null>(null);

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [managerFilter, setManagerFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            // Filter out INVITED users
            return res.data.filter((u: any) => u.status !== 'INVITED');
        },
    });

    // Get current user from localStorage or context (adjust based on your auth implementation)
    const currentUser: CurrentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const canEditUser = (user: any) => {
        if (!currentUser.id) return false;

        // Admin can edit anyone
        if (currentUser.role === 'CEO') return true;

        // Reporting Manager can edit their direct reports
        if (user.reporting_manager_id === currentUser.id) return true;

        return false;
    };

    const handleView = (userId: number) => {
        setSelectedUserId(userId);
        setViewMode('view');
    };

    const handleEdit = (userId: number) => {
        setSelectedUserId(userId);
        setViewMode('edit');
    };

    const handleClose = () => {
        setSelectedUserId(null);
        setViewMode(null);
    };

    const handleSwitchToEdit = () => {
        setViewMode('edit');
    };

    useEffect(() => { setPage(1); }, [search, roleFilter, managerFilter]);

    const managers = useMemo(() => {
        const seen = new Map<number, string>();
        (users || []).forEach((u: any) => {
            if (u.reporting_manager) {
                seen.set(u.reporting_manager.id, `${u.reporting_manager.first_name} ${u.reporting_manager.last_name}`);
            }
        });
        return Array.from(seen.entries());
    }, [users]);

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (users || []).filter((u: any) => {
            if (roleFilter && u.role !== roleFilter) return false;
            if (managerFilter && String(u.reporting_manager_id ?? '') !== managerFilter) return false;
            if (q) {
                const hay = `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [users, search, roleFilter, managerFilter]);

    const totalCount = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

    const hasFilters = !!search || !!roleFilter || !!managerFilter;
    const resetFilters = () => { setSearch(''); setRoleFilter(''); setManagerFilter(''); };

    const columns: TableColumn<any>[] = [
        {
            key: 'name', header: 'Name', headerAlign: 'center', render: user => (
                <div className="flex items-center gap-3">
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(user.id))}>
                        {initialsOf(user)}
                    </div>
                    <div className="min-w-0">
                        <div className="font-medium text-slate-800 truncate">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-slate-400 truncate">{user.email}</div>
                    </div>
                </div>
            ),
        },
        { key: 'role', header: 'Role', headerAlign: 'center', render: user => <span className="badge-indigo">{user.role}</span> },
        {
            key: 'reporting_manager', header: 'Reporting Manager', headerAlign: 'center', render: user => (
                <span className="text-slate-500">
                    {user.reporting_manager
                        ? `${user.reporting_manager.first_name} ${user.reporting_manager.last_name}`
                        : <span className="text-slate-300">N/A</span>}
                </span>
            ),
        },
        { key: 'targets', header: 'Targets', headerAlign: 'center', render: () => <span className="badge-gray">Product-wise</span> },
        {
            key: 'actions', header: 'Actions', align: 'right', headerAlign: 'center', width: 'w-28', render: user => {
                const canEdit = canEditUser(user);
                return (
                    <div className="flex justify-end gap-1">
                        <button
                            onClick={() => handleView(user.id)}
                            className="btn btn-ghost btn-sm btn-icon text-primary-600"
                            title="View Details"
                        >
                            <Eye size={14} />
                        </button>
                        {canEdit && (
                            <button
                                onClick={() => handleEdit(user.id)}
                                className="btn btn-ghost btn-sm btn-icon text-emerald-600"
                                title="Edit Performance / Targets"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <Target size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Target Management</h1>
                        <p className="page-subtitle">Configure product-wise targets for users</p>
                    </div>
                </div>
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
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="form-select text-sm w-[9rem] shrink-0">
                    <option value="">All Roles</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="form-select text-sm w-[11rem] shrink-0">
                    <option value="">All Reporting Managers</option>
                    {managers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
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
                    emptyTitle="No active users found"
                    emptySubtitle="All users may have INVITED status, or try adjusting the filters above."
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

            {/* Modals */}
            {viewMode === 'view' && selectedUserId && (
                <ViewUserModal
                    userId={selectedUserId}
                    onClose={handleClose}
                    onEdit={canEditUser(users?.find((u: any) => u.id === selectedUserId)) ? handleSwitchToEdit : undefined}
                    canEdit={canEditUser(users?.find((u: any) => u.id === selectedUserId))}
                />
            )}
            {viewMode === 'edit' && selectedUserId && (
                <EditUserPerformanceModal
                    userId={selectedUserId}
                    onClose={handleClose}
                />
            )}
        </div>
    );
}
