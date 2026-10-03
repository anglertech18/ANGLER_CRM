import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Edit, Phone, Mail, MapPin, Linkedin, Calendar, Briefcase, CheckCircle, Info } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';

export default function CallTrackerView() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: call, isLoading, isError } = useQuery({
        queryKey: ['call-tracker', id],
        queryFn: () => api.get(`/call-tracker/${id}`).then(res => res.data),
        enabled: !!id
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading call details...</div>;
    if (isError || !call) return (
        <div className="p-8 text-center">
            <p className="text-red-500 font-medium">Failed to load call entry.</p>
            <button onClick={() => navigate('/call-management/tracker')} className="mt-4 text-blue-600 underline text-sm">Back to list</button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/call-management/tracker')}
                        className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-500 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{call.company_name}</h1>
                        <p className="text-sm text-gray-500">
                            Call Entry #{call.id} · Created {dayjs(call.created_at).format('DD/MM/YYYY')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/calls/${id}/edit`)}
                    className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-sm"
                >
                    <Edit size={16} />
                    <span>Edit</span>
                </button>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-3">
                {call.call_status && (
                    <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase",
                        call.call_status.name === 'Converted to Lead' ? 'bg-green-100 text-green-700' :
                            call.call_status.name === 'Connected' ? 'bg-blue-100 text-blue-700' :
                                call.call_status.name === 'Interested' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-600'
                    )}>
                        📞 {call.call_status.name}
                    </span>
                )}
                {call.pipeline_action && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                        ✓ Move to {call.pipeline_action}
                    </span>
                )}
                {call.linkedin_sent && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Linkedin size={12} /> LinkedIn Sent
                    </span>
                )}
                {call.is_converted && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        ✓ Converted to Lead
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left section */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Classification */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-2 text-primary border-b pb-2 mb-5">
                            <Info size={16} />
                            <h2 className="font-bold uppercase text-xs tracking-wider">Classification</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Call Date</p>
                                <p className="font-bold text-gray-800">{dayjs(call.date).format('DD/MM/YYYY')}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Created Date</p>
                                <p className="font-bold text-gray-800">{dayjs(call.created_at).format('DD/MM/YYYY')}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Product</p>
                                <p className="font-medium text-gray-700">{call.product?.name || <span className="text-gray-400">—</span>}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Industry</p>
                                <p className="font-medium text-gray-700">{call.industry?.name || <span className="text-gray-400">—</span>}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Source of DB</p>
                                <p className="font-medium text-gray-700">{call.source_of_db?.name || <span className="text-gray-400">—</span>}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Business Potential</p>
                                <p className="font-medium text-gray-700">{call.business_potential || <span className="text-gray-400">—</span>}</p>
                            </div>
                        </div>
                    </div>

                    {/* Company & Contact */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex items-center space-x-2 text-primary border-b pb-2 mb-5">
                            <Briefcase size={16} />
                            <h2 className="font-bold uppercase text-xs tracking-wider">Company & Contact</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Company</p>
                                <p className="font-bold text-gray-900 text-base">{call.company_name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Location</p>
                                <p className="font-medium text-gray-700 flex items-center gap-1">
                                    {call.location ? <><MapPin size={12} className="text-gray-400" />{call.location}</> : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Contact Person</p>
                                <p className="font-medium text-gray-700">{call.contact_person_name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Designation</p>
                                <p className="font-medium text-gray-700">{call.designation || '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Company Email</p>
                                {call.email_address
                                    ? <a href={`mailto:${call.email_address}`} className="text-blue-600 hover:underline font-medium flex items-center gap-1"><Mail size={12} />{call.email_address}</a>
                                    : <p className="text-gray-400">—</p>}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Personal Email</p>
                                {(call as any).personal_email
                                    ? <a href={`mailto:${(call as any).personal_email}`} className="text-blue-600 hover:underline font-medium flex items-center gap-1"><Mail size={12} />{(call as any).personal_email}</a>
                                    : <p className="text-gray-400">—</p>}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Mobile No</p>
                                {call.mobile_no
                                    ? <a href={`tel:${call.mobile_no}`} className="text-blue-600 hover:underline font-medium flex items-center gap-1"><Phone size={12} />{call.mobile_no}</a>
                                    : <p className="text-gray-400">—</p>}
                            </div>
                        </div>
                    </div>

                    {/* Remarks */}
                    {call.remarks && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="font-bold uppercase text-xs tracking-wider text-gray-400 mb-3">Remarks / Notes</h2>
                            <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{call.remarks}</p>
                        </div>
                    )}
                </div>

                {/* Right section */}
                <div className="space-y-4">
                    {/* Engagement */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center space-x-2 text-primary border-b pb-2 mb-4">
                            <CheckCircle size={16} />
                            <h2 className="font-bold uppercase text-xs tracking-wider">Engagement</h2>
                        </div>
                        <div className="space-y-4 text-sm">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Email Status</p>
                                <p className="font-medium text-gray-700">{call.email_status?.name || '—'}</p>
                            </div>
                            <div className="flex items-center justify-between border-t pt-3">
                                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1"><Linkedin size={12} className="text-blue-500" /> LinkedIn Sent</span>
                                <span className={clsx("text-xs font-bold", call.linkedin_sent ? "text-blue-600" : "text-gray-400")}>
                                    {call.linkedin_sent ? '✓ Yes' : 'No'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Follow-up */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center space-x-2 text-orange-500 border-b pb-2 mb-4">
                            <Calendar size={16} />
                            <h2 className="font-bold uppercase text-xs tracking-wider text-orange-600">Follow Up</h2>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Next Follow-up Date</p>
                                {call.next_follow_up_date
                                    ? <p className="font-bold text-orange-600 text-base">{dayjs(call.next_follow_up_date).format('DD/MM/YYYY')}</p>
                                    : <p className="text-gray-400">Not scheduled</p>}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Move to Pipeline</p>
                                <p className={clsx("font-bold", call.pipeline_action ? "text-green-600" : "text-gray-400")}>
                                    {call.pipeline_action ? `Move to ${call.pipeline_action}` : 'Select'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
