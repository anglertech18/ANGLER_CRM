import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Eye, Edit2 } from 'lucide-react';
import ViewUserModal from './ViewUserModal';
import EditUserPerformanceModal from './EditUserPerformanceModal';

interface CurrentUser {
    id: number;
    role: string;
}

export default function UserManagement() {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'view' | 'edit' | null>(null);

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


    if (isLoading) return <div className="p-8">Loading...</div>;

    // Debug logging
    console.log('UserManagement - users data:', users);
    console.log('UserManagement - users length:', users?.length);

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold">Target Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Configure product-wise targets for users.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporting Manager</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Targets</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users?.map((user: any) => {
                                const canEdit = canEditUser(user);

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.reporting_manager
                                                ? `${user.reporting_manager.first_name} ${user.reporting_manager.last_name}`
                                                : <span className="text-gray-400">N/A</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="text-xs italic">Click View / Edit</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-3">
                                                <button
                                                    onClick={() => handleView(user.id)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleEdit(user.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Edit Performance"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {(!users || users.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No active users found. All users may have INVITED status.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
