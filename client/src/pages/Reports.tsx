import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { BarChart2 } from 'lucide-react';

const QUADRANT_COLORS: Record<string, string> = {
    Q1: '#2563EB', Q2: '#F59E0B', Q3: '#F97316', Q4: '#16A34A',
};
const FALLBACK_COLORS = ['#2563EB', '#F59E0B', '#F97316', '#16A34A', '#8B5CF6'];
const qColor = (name: string, idx: number) => QUADRANT_COLORS[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

export default function Reports() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => api.get('/reports/dashboard').then(r => r.data),
    });

    const quadrantData = stats?.quadrantStats?.map((q: any) => ({
        name: q.quadrant,
        value: q._count.id
    })) ?? [];

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                        <BarChart2 size={16} className="text-primary-600" />
                    </div>
                    <div>
                        <h1 className="page-title">MIS Dashboard</h1>
                        <p className="page-subtitle">Pipeline overview and lead distribution</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => (
                        <div key={i} className="card p-6">
                            <div className="skeleton h-4 w-40 rounded mb-4" />
                            <div className="skeleton h-64 rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie chart */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="text-sm font-semibold text-slate-800">Lead Distribution</h2>
                        </div>
                        <div className="p-6 h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={quadrantData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={90}
                                        dataKey="value"
                                    >
                                        {quadrantData.map((entry: any, i: number) => (
                                            <Cell key={`cell-${i}`} fill={qColor(entry.name, i)} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar chart */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="text-sm font-semibold text-slate-800">Lead Volume by Quadrant</h2>
                        </div>
                        <div className="p-6 h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={quadrantData}
                                    margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#CBD5E1' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
                                    />
                                    <Bar dataKey="value" name="Leads" radius={[5, 5, 0, 0]} barSize={40}>
                                        {quadrantData.map((entry: any, i: number) => (
                                            <Cell key={`bar-cell-${i}`} fill={qColor(entry.name, i)} fillOpacity={0.9} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
