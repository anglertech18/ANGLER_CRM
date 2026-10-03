import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Plus, Mail, XCircle, RefreshCw, CheckCircle, Eye, Edit, Power, Shield, Trash2 } from 'lucide-react';
import UserForm from './UserForm';
import PrivilegeModal from './PrivilegeModal';
import { useAuth } from '../../context/AuthContext';
import Table, { type TableColumn } from '../../components/Table';
import TablePagination from '../../components/TablePagination';

export default function InviteUsers() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [viewUser, setViewUser] = useState<any>(null);
    const [privilegeUser, setPrivilegeUser] = useState<any>(null);
    const [showInactive, setShowInactive] = useState(false);
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
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>;
            case 'INACTIVE':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>;
            case 'INVITED':
            default:
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
        }
    };

    useEffect(() => { setPage(1); }, [showInactive]);

    const filteredUsers = (users || []).filter((u: any) => showInactive || u.status !== 'INACTIVE');
    const totalCount = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

    const columns: TableColumn<any>[] = [
        { key: 'name', header: 'User Name', render: user => <span className="font-medium text-gray-900">{user.first_name} {user.last_name}</span> },
        { key: 'email', header: 'Email', render: user => <span className="text-gray-500">{user.email}</span> },
        { key: 'role', header: 'Role', render: user => <span className="text-gray-500">{user.role}</span> },
        { key: 'department', header: 'Dept', render: user => <span className="text-gray-500">{user.department}</span> },
        { key: 'company', header: 'Company', render: user => <span className="text-gray-500">{user.company?.name || '-'}</span> },
        { key: 'sbu', header: 'SBU', render: user => <span className="text-gray-500">{user.sbu?.name || '-'}</span> },
        {
            key: 'reporting_manager', header: 'Reporting Manager', render: user => (
                <span className="text-gray-500">{user.reporting_manager ? `${user.reporting_manager.first_name} ${user.reporting_manager.last_name}` : '-'}</span>
            ),
        },
        {
            key: 'joining_date', header: 'Invited On', render: user => (
                <span className="text-gray-500">{user.joining_date ? new Date(user.joining_date).toLocaleDateString() : 'N/A'}</span>
            ),
        },
        { key: 'status', header: 'Status', align: 'center', render: user => getStatusBadge(user.status) },
        {
            key: 'actions', header: 'Actions', align: 'right', render: user => (
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={() => handleResend(user.id)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Resend Invite"
                        disabled={user.status !== 'INVITED'}
                    >
                        <RefreshCw size={18} className={user.status !== 'INVITED' ? 'text-gray-300' : ''} />
                    </button>
                    <button onClick={() => setViewUser(user)} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                        <Eye size={18} />
                    </button>
                    <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900 p-1" title="Edit">
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={() => handleToggleStatus(user)}
                        className={`${user.status === 'ACTIVE' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} p-1`}
                        title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    >
                        <Power size={18} />
                    </button>
                    {isAdmin && (
                        <button onClick={() => setPrivilegeUser(user)} className="text-blue-600 hover:text-blue-900 p-1" title="Manage Privileges">
                            <Shield size={18} />
                        </button>
                    )}
                    <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete User">
                        <Trash2 size={18} />
                    </button>
                </div>
            ),
        },
    ];

    if (isLoading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold">Invite Users / User List</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage user invitations and status.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${showInactive ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'} text-sm font-medium`}
                    >
                        {showInactive ? 'Hide Inactive Users' : 'Show Inactive Users'}
                    </button>
                    <button
                        onClick={handleInvite}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors w-full md:w-auto"
                    >
                        <Plus size={20} />
                        <span>Invite User</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table
                    columns={columns}
                    data={pagedUsers}
                    getRowKey={user => user.id}
                    maxHeight="max-h-[65vh]"
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

            {/* View Modal */}
            {viewUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-[500px] p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">User Details</h2>
                            <button onClick={() => setViewUser(null)} className="text-gray-500 hover:text-gray-700">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Full Name</label>
                                    <p className="text-gray-900">{viewUser.first_name} {viewUser.last_name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Status</label>
                                    <div>{getStatusBadge(viewUser.status)}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Email</label>
                                    <p className="text-gray-900">{viewUser.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Role</label>
                                    <p className="text-gray-900">{viewUser.role}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Department</label>
                                    <p className="text-gray-900">{viewUser.department}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Company</label>
                                    <p className="text-gray-900">{viewUser.company?.name || '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">SBU</label>
                                    <p className="text-gray-900">{viewUser.sbu?.name || '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Reporting Manager</label>
                                    <p className="text-gray-900">{viewUser.reporting_manager ? `${viewUser.reporting_manager.first_name} ${viewUser.reporting_manager.last_name}` : '-'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Joined On</label>
                                    <p className="text-gray-900">{viewUser.joining_date ? new Date(viewUser.joining_date).toLocaleDateString() : '-'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-2">Assigned Privileges</label>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 max-h-40 overflow-y-auto">
                                    {viewUser.privileges?.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {viewUser.privileges.filter((p: any) => p.can_view || p.can_add || p.can_edit || p.can_delete).map((p: any) => (
                                                <div key={p.module_name} className="text-xs bg-white p-2 rounded border border-gray-200">
                                                    <span className="font-bold block mb-1 text-gray-700">{p.module_name}</span>
                                                    <div className="flex space-x-2 text-[10px] uppercase font-bold text-gray-500">
                                                        {p.can_view && <span className="text-blue-600">View</span>}
                                                        {p.can_add && <span className="text-green-600">Add</span>}
                                                        {p.can_edit && <span className="text-orange-600">Edit</span>}
                                                        {p.can_delete && <span className="text-red-600">Del</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No specific privileges assigned.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setViewUser(null)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <UserForm
                    initialData={editingUser}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            {privilegeUser && (
                <PrivilegeModal
                    userId={privilegeUser.id}
                    userName={`${privilegeUser.first_name} ${privilegeUser.last_name}`}
                    onClose={() => setPrivilegeUser(null)}
                />
            )}
        </div>
    );
}
