import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Edit, Shield, CheckCircle, XCircle, Users as UsersIcon, Mail, MailX } from 'lucide-react';
import UserForm from './UserForm';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

export default function Users() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/users').then(r => r.data),
    });

    const totalCount = users?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedUsers = (users || []).slice((safePage - 1) * pageSize, safePage * pageSize);

    const toggleStatusMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/users/${id}/toggle-status`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const handleToggleStatus = (id: number, isActive: boolean) => {
        if (window.confirm(`Are you sure you want to ${isActive ? 'deactivate' : 'activate'} this user?`)) {
            toggleStatusMutation.mutate(id);
        }
    };

    const toggleDailyReportMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/users/${id}/toggle-daily-report`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const handleToggleDailyReport = (id: number, isEnabled: boolean) => {
        if (window.confirm(`${isEnabled ? 'Disable' : 'Enable'} the automated Daily Report email for this user?`)) {
            toggleDailyReportMutation.mutate(id);
        }
    };

    const handleEdit = (user: any) => { setEditingUser(user); setIsModalOpen(true); };
    const handleAdd  = ()          => { setEditingUser(null);  setIsModalOpen(true); };

    const columns: TableColumn<any>[] = [
        { key: 'name', header: 'Name', render: user => <span className="font-semibold text-slate-800">{user.first_name} {user.last_name}</span> },
        { key: 'email', header: 'Email', render: user => <span className="text-slate-500">{user.email}</span> },
        { key: 'role', header: 'Role', render: user => <span className="badge badge-blue">{user.role}</span> },
        { key: 'company', header: 'Company', render: user => <span className="text-slate-500">{user.company?.name || '—'}</span> },
        {
            key: 'status', header: 'Status', render: user => (
                <span className={clsx('badge', user.is_active ? 'badge-green' : 'badge-red')}>
                    {user.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            key: 'daily_report', header: 'Daily Report', render: user => (
                <span className={clsx('badge', user.daily_report_enabled ? 'badge-green' : 'badge-red')}>
                    {user.daily_report_enabled ? 'Enabled' : 'Disabled'}
                </span>
            ),
        },
        {
            key: 'actions', header: 'Actions', align: 'right', render: user => (
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        className={clsx(
                            'btn btn-ghost btn-sm btn-icon',
                            user.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        )}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                        {user.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    </button>
                    <button
                        onClick={() => handleToggleDailyReport(user.id, user.daily_report_enabled)}
                        className={clsx(
                            'btn btn-ghost btn-sm btn-icon',
                            user.daily_report_enabled ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                        )}
                        title={user.daily_report_enabled ? 'Disable Daily Report' : 'Enable Daily Report'}
                    >
                        {user.daily_report_enabled ? <MailX size={14} /> : <Mail size={14} />}
                    </button>
                    <Link
                        to={`/admin/privileges/${user.id}`}
                        className="btn btn-ghost btn-sm btn-icon text-violet-600 hover:bg-violet-50"
                        title="Manage Privileges"
                    >
                        <Shield size={14} />
                    </Link>
                    <button onClick={() => handleEdit(user)} className="btn btn-ghost btn-sm btn-icon text-primary-600" title="Edit">
                        <Edit size={14} />
                    </button>
                </div>
            ),
        },
    ];

    if (isLoading) return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="skeleton h-6 w-48 rounded" />
                <div className="skeleton h-9 w-28 rounded-lg" />
            </div>
            <div className="card overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-slate-50">
                        {[120, 180, 80, 100, 60, 80, 80].map((w, j) => (
                            <div key={j} className="skeleton h-3 rounded" style={{ width: w }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <UsersIcon size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">Target Management</h1>
                        <p className="page-subtitle">Manage user accounts, roles, and targets</p>
                    </div>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <Plus size={15} />
                    Add User
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
                    data={pagedUsers}
                    getRowKey={user => user.id}
                    maxHeight="max-h-[65vh]"
                    emptyIcon={<UsersIcon size={16} className="text-slate-400" />}
                    emptyTitle="No users found"
                />
                <TablePagination
                    page={safePage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
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
