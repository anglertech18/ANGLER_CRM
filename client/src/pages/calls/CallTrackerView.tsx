import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
    ArrowLeft, Edit, Phone, Mail, MapPin, Linkedin, Calendar, Briefcase,
    CheckCircle, Info, User, AlertCircle, Building2, Sparkles, Target, Clock,
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';

/* ── Field: label + value ── */
const Field = ({ label, icon: Icon, children, span2 }: {
    label: string; icon?: any; children: React.ReactNode; span2?: boolean;
}) => (
    <div className={span2 ? 'md:col-span-2' : undefined}>
        <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {Icon && <Icon size={10} className="text-slate-300" />}
            {label}
        </p>
        <div className="text-sm font-medium text-slate-800">{children}</div>
    </div>
);

/* ── Section accent colors ── */
type SectionColor = 'blue' | 'emerald' | 'orange' | 'violet';
const SECTION_COLORS: Record<SectionColor, { header: string; iconBg: string; iconBorder: string; iconText: string }> = {
    blue:    { header: 'from-blue-50 to-transparent',    iconBg: 'bg-blue-50',    iconBorder: 'border-blue-100',    iconText: 'text-blue-600' },
    emerald: { header: 'from-emerald-50 to-transparent', iconBg: 'bg-emerald-50', iconBorder: 'border-emerald-100', iconText: 'text-emerald-600' },
    orange:  { header: 'from-orange-50 to-transparent',  iconBg: 'bg-orange-50',  iconBorder: 'border-orange-100',  iconText: 'text-orange-600' },
    violet:  { header: 'from-violet-50 to-transparent',  iconBg: 'bg-violet-50',  iconBorder: 'border-violet-100',  iconText: 'text-violet-600' },
};

/* ── Card section heading ── */
const SectionHead = ({ icon: Icon, title, color = 'blue' }: { icon: any; title: string; color?: SectionColor }) => {
    const c = SECTION_COLORS[color];
    return (
        <div className={clsx('card-header bg-gradient-to-r rounded-t-2xl', c.header)}>
            <div className="flex items-center gap-2.5">
                <div className={clsx('w-7 h-7 rounded-lg border flex items-center justify-center shrink-0', c.iconBg, c.iconBorder)}>
                    <Icon size={14} className={c.iconText} />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h2>
            </div>
        </div>
    );
};

const CALL_STATUS_BADGE: Record<string, string> = {
    'Converted to Lead': 'badge-emerald',
    'Connected': 'badge-blue',
    'Interested': 'badge-purple',
};

const FOLLOW_UP_BADGE: Record<string, string> = {
    Closed: 'badge-green',
    InProgress: 'badge-blue',
};

export default function CallTrackerView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: call, isLoading, isError, error } = useQuery({
        queryKey: ['call-tracker', id],
        queryFn: () => api.get(`/call-tracker/${id}`).then(res => res.data),
        enabled: !!id
    });

    /* ── Loading ── */
    if (isLoading) return (
        <div className="page-wrapper">
            <div className="flex items-center gap-3 mb-8">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="skeleton h-5 w-48 rounded" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {[1, 2].map(i => (
                        <div key={i} className="card p-6 space-y-4">
                            <div className="skeleton h-4 w-40 rounded" />
                            <div className="grid grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map(j => (
                                    <div key={j} className="space-y-2">
                                        <div className="skeleton h-2.5 w-20 rounded" />
                                        <div className="skeleton h-4 w-32 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="space-y-6">
                    <div className="card p-6 space-y-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
                    </div>
                </div>
            </div>
        </div>
    );

    /* ── Error ── */
    if (isError || !call) return (
        <div className="page-wrapper">
            <div className="card p-4 flex items-center gap-3 text-red-600 border-red-200">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">
                    {(error as any)?.response?.data?.message || (error as any)?.message || 'Failed to load call entry.'}
                </span>
                <button onClick={() => navigate('/call-management/tracker')} className="ml-auto text-blue-600 underline text-sm shrink-0">
                    Back to list
                </button>
            </div>
        </div>
    );

    const statusBadgeClass = CALL_STATUS_BADGE[call.call_status?.name] || 'badge-gray';
    const followUpBadgeClass = call.follow_up_status === 'Closed' ? 'badge-green'
        : call.follow_up_status === 'InProgress' ? 'badge-blue' : 'badge-amber';

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-50">
            {/* ════════ Sticky Header ════════ */}
            <div className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-20">
                <div className="px-6 md:px-8 py-5 max-w-[1440px] mx-auto">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            <button
                                onClick={() => navigate('/call-management/tracker')}
                                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-colors shrink-0 mt-0.5"
                            >
                                <ArrowLeft size={16} />
                            </button>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
                                        {call.company_name || '—'}
                                    </h1>
                                    {call.call_status && (
                                        <span className={clsx('badge', statusBadgeClass)}>
                                            <Phone size={10} /> {call.call_status.name}
                                        </span>
                                    )}
                                    {call.pipeline_action && (
                                        <span className="badge badge-green flex items-center gap-1">
                                            <CheckCircle size={10} /> Move to {call.pipeline_action}
                                        </span>
                                    )}
                                    {call.linkedin_sent && (
                                        <span className="badge badge-blue flex items-center gap-1">
                                            <Linkedin size={10} /> LinkedIn Sent
                                        </span>
                                    )}
                                    {call.is_converted && (
                                        <span className="badge badge-emerald flex items-center gap-1">
                                            <Sparkles size={10} /> Converted to Lead
                                        </span>
                                    )}
                                </div>
                                <p className="flex items-center gap-1.5 text-sm text-slate-500 mt-1.5">
                                    <span>Call Entry #{call.id}</span>
                                    <span className="text-slate-300">·</span>
                                    <span>Created {dayjs(call.created_at).format('DD/MM/YYYY')}</span>
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/calls/${id}/edit`)}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm shrink-0"
                        >
                            <Edit size={14} />
                            <span>Edit</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ════════ Body ════════ */}
            <div className="px-6 md:px-8 py-6 max-w-[1440px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left section */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Classification */}
                        <div className="card overflow-hidden">
                            <SectionHead icon={Info} title="Classification" color="blue" />
                            <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-5">
                                <Field label="Call Date">{dayjs(call.date).format('DD/MM/YYYY')}</Field>
                                <Field label="Created Date">{dayjs(call.created_at).format('DD/MM/YYYY')}</Field>
                                <Field label="Product">{call.product?.name || <span className="text-slate-400 font-normal">—</span>}</Field>
                                <Field label="Industry">{call.industry?.name || <span className="text-slate-400 font-normal">—</span>}</Field>
                                <Field label="Source of DB">{call.source_of_db?.name || <span className="text-slate-400 font-normal">—</span>}</Field>
                                <Field label="Lead Source">{call.lead_source?.name || <span className="text-slate-400 font-normal">—</span>}</Field>
                                <Field label="Business Potential">{call.business_potential || <span className="text-slate-400 font-normal">—</span>}</Field>
                                <Field label="Owner" icon={User}>
                                    {call.user ? `${call.user.first_name} ${call.user.last_name || ''}`.trim() : <span className="text-slate-400 font-normal">—</span>}
                                </Field>
                                <Field label="Last Updated">{dayjs(call.updated_at).format('DD/MM/YYYY')}</Field>
                            </div>
                        </div>

                        {/* Company & Contact */}
                        <div className="card overflow-hidden">
                            <SectionHead icon={Briefcase} title="Company & Contact" color="violet" />
                            <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Company" icon={Building2} span2>
                                    <span className="text-base font-bold text-slate-900">{call.company_name || '—'}</span>
                                </Field>
                                <Field label="Location" icon={MapPin}>
                                    {call.location || <span className="text-slate-400 font-normal">—</span>}
                                </Field>
                                <Field label="Contact Person" icon={User}>
                                    {call.contact_person_name || <span className="text-slate-400 font-normal">—</span>}
                                </Field>
                                <Field label="Designation">
                                    {call.designation || <span className="text-slate-400 font-normal">—</span>}
                                </Field>
                                <Field label="Company Email" icon={Mail}>
                                    {call.email_address
                                        ? <a href={`mailto:${call.email_address}`} className="text-blue-600 hover:underline">{call.email_address}</a>
                                        : <span className="text-slate-400 font-normal">—</span>}
                                </Field>
                                <Field label="Personal Email" icon={Mail}>
                                    {(call as any).personal_email
                                        ? <a href={`mailto:${(call as any).personal_email}`} className="text-blue-600 hover:underline">{(call as any).personal_email}</a>
                                        : <span className="text-slate-400 font-normal">—</span>}
                                </Field>
                                <Field label="Mobile No" icon={Phone}>
                                    {call.mobile_no
                                        ? <a href={`tel:${call.mobile_no}`} className="text-blue-600 hover:underline">{call.mobile_no}</a>
                                        : <span className="text-slate-400 font-normal">—</span>}
                                </Field>
                            </div>
                        </div>

                        {/* Remarks */}
                        {call.remarks && (
                            <div className="card overflow-hidden">
                                <SectionHead icon={Info} title="Remarks / Notes" color="blue" />
                                <div className="card-body">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{call.remarks}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right section */}
                    <div className="space-y-6">
                        {/* Engagement */}
                        <div className="card overflow-hidden">
                            <SectionHead icon={CheckCircle} title="Engagement" color="emerald" />
                            <div className="card-body space-y-4">
                                <Field label="Email Status">
                                    {call.email_status?.name || <span className="text-slate-400 font-normal">—</span>}
                                </Field>
                                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                        <Linkedin size={12} className="text-blue-500" /> LinkedIn Sent
                                    </span>
                                    <span className={clsx('badge', call.linkedin_sent ? 'badge-blue' : 'badge-gray')}>
                                        {call.linkedin_sent ? 'Yes' : 'No'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Follow-up */}
                        <div className="card overflow-hidden">
                            <SectionHead icon={Calendar} title="Follow Up" color="orange" />
                            <div className="card-body space-y-4">
                                <Field label="Next Follow-up Date">
                                    {call.next_follow_up_date
                                        ? <span className="text-base font-bold text-orange-600">{dayjs(call.next_follow_up_date).format('DD/MM/YYYY')}</span>
                                        : <span className="text-slate-400 font-normal">Not scheduled</span>}
                                </Field>
                                <Field label="Follow Up Status">
                                    <span className={clsx('badge', followUpBadgeClass)}>
                                        {call.follow_up_status === 'InProgress' ? 'In Progress' : (call.follow_up_status || 'Pending')}
                                    </span>
                                </Field>
                                {call.follow_up_note && (
                                    <Field label="Follow Up Note">
                                        <span className="whitespace-pre-wrap font-normal text-slate-700">{call.follow_up_note}</span>
                                    </Field>
                                )}
                                <Field label="Move to Pipeline">
                                    <span className={clsx('font-bold', call.pipeline_action ? 'text-green-600' : 'text-slate-400 font-normal')}>
                                        {call.pipeline_action ? `Move to ${call.pipeline_action}` : 'Select'}
                                    </span>
                                </Field>
                            </div>
                        </div>

                        {/* Conversion */}
                        {(call.is_converted || call.moved_to_quad || call.lead || call.enquiry) && (
                            <div className="card overflow-hidden">
                                <SectionHead icon={Target} title="Conversion" color="emerald" />
                                <div className="card-body space-y-4">
                                    {call.moved_to_quad && (
                                        <Field label="Moved to Quadrant">
                                            <span className="badge badge-emerald">{call.moved_to_quad}</span>
                                        </Field>
                                    )}
                                    {call.quadrant_moved_date && (
                                        <Field label="Quadrant Moved Date" icon={Clock}>
                                            {dayjs(call.quadrant_moved_date).format('DD/MM/YYYY')}
                                        </Field>
                                    )}
                                    {call.is_converted && call.converted_at && (
                                        <Field label="Converted At" icon={Clock}>
                                            {dayjs(call.converted_at).format('DD/MM/YYYY')}
                                        </Field>
                                    )}
                                    {call.lead && (
                                        <Field label="Linked Lead">
                                            <button
                                                onClick={() => navigate(`/leads/${call.lead.id}`)}
                                                className="text-blue-600 hover:underline font-semibold"
                                            >
                                                View Lead #{call.lead.id}
                                            </button>
                                        </Field>
                                    )}
                                    {call.enquiry && (
                                        <Field label="Linked Enquiry">
                                            <button
                                                onClick={() => navigate(`/enquiry-tracker/${call.enquiry.id}/edit`)}
                                                className="text-blue-600 hover:underline font-semibold"
                                            >
                                                View Enquiry #{call.enquiry.id}
                                            </button>
                                        </Field>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
