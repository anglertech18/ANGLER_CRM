import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { X, User, Briefcase, Users, Target } from 'lucide-react';

interface ViewUserModalProps {
    userId: number;
    onClose: () => void;
    onEdit?: () => void;
    canEdit: boolean;
}

const TARGET_FIELDS = [
    { key: 'sales_target', label: 'Sales Target' },
    { key: 'revenue_target', label: 'Revenue Target' },
    { key: 'device_target', label: 'Device / License Target' },
    { key: 'partner_target', label: 'Partner Sign-Up Target' },
    { key: 'leads_target', label: 'Leads Target' },
    { key: 'calls_target', label: 'Calls Target (per day)' },
    { key: 'linkedin_target', label: 'LinkedIn Acceptance Target (per day)' },
    { key: 'direct_visit_target', label: 'Direct Visit Target (per day)' },
];

function TargetTable({ targets }: { targets: Record<string, any> }) {
    const hasAny = TARGET_FIELDS.some(f => targets[f.key] && targets[f.key] !== 0);
    if (!hasAny) return <p className="text-xs text-gray-400 italic">No targets set</p>;
    return (
        <div className="grid grid-cols-2 gap-1.5 text-xs">
            {TARGET_FIELDS.map(f => targets[f.key] > 0 && (
                <div key={f.key} className="flex justify-between bg-gray-50 rounded px-2 py-1">
                    <span className="text-gray-500">{f.label}</span>
                    <span className="font-semibold text-gray-800">{targets[f.key]}</span>
                </div>
            ))}
        </div>
    );
}

export default function ViewUserModal({ userId, onClose, onEdit, canEdit }: ViewUserModalProps) {
    const { data: user, isLoading: isLoadingUser } = useQuery({
        queryKey: ['user-detail', userId],
        queryFn: async () => {
            const res = await api.get(`/users/${userId}`);
            return res.data;
        }
    });

    const { data: allTargets, isLoading: isLoadingTargets } = useQuery({
        queryKey: ['user-all-targets', userId],
        queryFn: async () => {
            const res = await api.get(`/users/${userId}/targets`);
            return res.data;
        }
    });

    if (isLoadingUser) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
                    <div className="text-center">Loading...</div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const productTargets: any[] = allTargets?.productTargets || [];
    const serviceTargets: any[] = allTargets?.serviceTargets || [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">User Targets</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* User Info Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-500 text-white rounded-full p-2.5">
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {user.first_name} {user.last_name}
                                    </h3>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            <div className="text-sm text-right shrink-0 space-y-1">
                                <div className="flex items-center gap-2 justify-end">
                                    <Briefcase size={13} className="text-gray-400" />
                                    <span className="text-gray-700 font-medium">{user.role}</span>
                                </div>
                                <div className="flex items-center gap-2 justify-end">
                                    <Users size={13} className="text-gray-400" />
                                    <span className="text-gray-600">
                                        {user.reporting_manager
                                            ? `${user.reporting_manager.first_name} ${user.reporting_manager.last_name}`
                                            : 'No manager'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Targets */}
                    {isLoadingTargets ? (
                        <div className="text-center py-6 text-gray-400 text-sm">Loading targets...</div>
                    ) : (productTargets.length === 0 && serviceTargets.length === 0) ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                            <Target size={24} className="text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No targets configured yet</p>
                            {canEdit && (
                                <p className="text-xs text-gray-400 mt-1">Click "Edit Targets" to set up targets</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Product Targets */}
                            {productTargets.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Target size={14} className="text-blue-500" />
                                        Product Targets
                                    </h4>
                                    <div className="space-y-3">
                                        {productTargets.map((pt: any) => (
                                            <div key={pt.id} className="border border-gray-100 rounded-lg p-3">
                                                <p className="text-sm font-medium text-gray-800 mb-2">{pt.product?.name}</p>
                                                <TargetTable targets={pt} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Service Targets */}
                            {serviceTargets.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Target size={14} className="text-green-500" />
                                        Service Targets
                                    </h4>
                                    <div className="space-y-3">
                                        {serviceTargets.map((st: any) => (
                                            <div key={st.id} className="border border-gray-100 rounded-lg p-3">
                                                <p className="text-sm font-medium text-gray-800 mb-2">{st.service_department}</p>
                                                <TargetTable targets={st} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                    >
                        Close
                    </button>
                    {canEdit && onEdit && (
                        <button
                            onClick={onEdit}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Edit Targets
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
