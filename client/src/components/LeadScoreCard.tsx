import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import DateOverlay from './DateOverlay';

interface BantState {
    budget_yes_no: boolean;
    budget_allocated: string;
    approval_stage: string;
    authority_yes_no: boolean;
    decision_maker: string;
    need_yes_no: boolean;
    pain_points_desc: string;
    timeline_yes_no: boolean;
    expected_closure_date: string;
}

interface ScoreCardProps {
    scores: {
        // A. Lead Source Details
        lead_source_quality: number;
        decision_contact_score: number;
        // B. Organization Needs
        reduce_cost_score: number;
        efficiency_score: number;
        automation_score: number;
        others_score: number;
        others_score_label?: string;
        // C. BANT Critical
        established_need_score: number;
        urgency_score: number;
        budget_allocated_score: number;
        decision_maker_score: number;
        // D. Other Info
        competition_score: number;
        champion_score: number;
        influencer_score: number;
        // E. Compliance
        compliance_score: number;
    };
    bant?: BantState;
    onBantChange?: (field: string, value: any) => void;
    contactOptions?: string[];
    onChange?: (field: string, value: any) => void;
    readOnly?: boolean;
}

export default function LeadScoreCard({ scores, bant, onBantChange, contactOptions, onChange, readOnly = false }: ScoreCardProps) {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        leadSource: true,
        orgNeeds: true,
        bant: true,
        otherInfo: true,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const ScoreButton = ({ current, value, field, extraDisabled }: { current: number; value: number; field: string; extraDisabled?: boolean }) => {
        const isDisabled = readOnly || !!extraDisabled;
        const isSelected = current === value;
        return (
            <button
                type="button"
                onClick={() => !isDisabled && onChange?.(field, value)}
                disabled={isDisabled}
                className={`px-4 py-2 rounded border font-medium transition-colors ${isSelected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
                {value}
            </button>
        );
    };

    const ScoreRow = ({ label, field, description, current }: { label: string; field: string; description: string; current: number }) => (
        <div className="py-3 border-b last:border-b-0">
            <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end ml-2">
                    <ScoreButton current={current} value={0} field={field} />
                    <ScoreButton current={current} value={1} field={field} />
                    <ScoreButton current={current} value={2} field={field} />
                </div>
            </div>
        </div>
    );

    const SectionHeader = ({ title, sectionKey, total, max }: { title: string; sectionKey: string; total: number; max: number }) => (
        <button
            type="button"
            onClick={() => toggleSection(sectionKey)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
            <div className="flex items-center space-x-3">
                {expandedSections[sectionKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                <h3 className="font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="flex flex-col items-end space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <span className="text-sm text-gray-600">Score: {total} / {max}</span>
                <div className="w-20 sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${(total / max) * 100}%` }}
                    />
                </div>
            </div>
        </button>
    );

    // Calculate section totals with fallbacks to prevent NaN
    const leadSourceTotal = (scores?.lead_source_quality || 0) + (scores?.decision_contact_score || 0);
    const orgNeedsTotal = (scores?.reduce_cost_score || 0) + (scores?.efficiency_score || 0) + (scores?.automation_score || 0) + (scores?.others_score || 0) + (scores?.compliance_score || 0);
    // Mirrors calculateLeadScore() on the backend and LeadForm's calculateTotalScore():
    // Section C scores are always summed as entered (checkboxes gate whether a score can be
    // set at all — see extraDisabled below — not whether an already-set score counts).
    const bantTotal =
        (scores?.budget_allocated_score || 0) +
        (scores?.decision_maker_score || 0) +
        (scores?.established_need_score || 0) +
        (scores?.urgency_score || 0);
    const otherInfoTotal = (scores?.competition_score || 0) + (scores?.champion_score || 0) + (scores?.influencer_score || 0);
    const overallTotal = leadSourceTotal + orgNeedsTotal + bantTotal + otherInfoTotal;

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-600 rounded-lg shrink-0">
                            <Calculator className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Lead Qualification Score Card</h2>
                            <p className="text-sm text-gray-600">Rate each criterion: 0 (Not applicable), 1 (Moderate), 2 (Strong)</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3 md:block md:text-center">
                        <div className="text-3xl font-bold text-blue-600">{overallTotal}</div>
                        <div className="text-sm text-gray-600">/ 28</div>
                    </div>
                </div>
            </div>

            {/* A. Lead Source Details */}
            <div className="border-b">
                <SectionHeader title="A. Lead Source Details" sectionKey="leadSource" total={leadSourceTotal} max={4} />
                {expandedSections.leadSource && (
                    <div className="p-4">
                        <ScoreRow
                            label="Lead Source Quality"
                            field="lead_source_quality"
                            description="Quality and reliability of lead source"
                            current={scores.lead_source_quality}
                        />
                        <ScoreRow
                            label="Decision Maker Contact"
                            field="decision_contact_score"
                            description="Decision maker contact gathering quality"
                            current={scores.decision_contact_score}
                        />
                    </div>
                )}
            </div>

            {/* B. Organization Needs */}
            <div className="border-b">
                <SectionHeader title="B. Organization Needs" sectionKey="orgNeeds" total={orgNeedsTotal} max={10} />
                {expandedSections.orgNeeds && (
                    <div className="p-4">
                        <ScoreRow
                            label="Reduce Cost"
                            field="reduce_cost_score"
                            description="Headcount, Maintenance, Time Savings"
                            current={scores.reduce_cost_score}
                        />
                        <ScoreRow
                            label="Efficiency"
                            field="efficiency_score"
                            description="Response time, Service quality improvements"
                            current={scores.efficiency_score}
                        />
                        <ScoreRow
                            label="Automation"
                            field="automation_score"
                            description="Brand progressive, Manual activities automation"
                            current={scores.automation_score}
                        />
                        <ScoreRow
                            label="Compliance"
                            field="compliance_score"
                            description="Mandatory Certifications, Loan requirements, etc."
                            current={scores.compliance_score}
                        />
                        <div className="py-3 border-b last:border-b-0">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Others (specify)"
                                        value={scores.others_score_label || ''}
                                        onChange={(e) => !readOnly && onChange?.('others_score_label', e.target.value)}
                                        disabled={readOnly}
                                        className="font-medium text-gray-900 border-b border-dashed border-gray-300 focus:border-blue-500 outline-none bg-transparent w-full"
                                    />
                                    <p className="text-sm text-gray-500">Custom need description</p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-end ml-2">
                                    <ScoreButton current={scores.others_score} value={0} field="others_score" />
                                    <ScoreButton current={scores.others_score} value={1} field="others_score" />
                                    <ScoreButton current={scores.others_score} value={2} field="others_score" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* C. BANT / Critical Qualification Factors */}
            <div className="border-b">
                <SectionHeader title="C. BANT / Critical Qualification Factors" sectionKey="bant" total={bantTotal} max={8} />
                {expandedSections.bant && (
                    <div className="p-4 space-y-4">

                        {/* Budget Confirmed → Allocated Budget */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="p-3 bg-gray-50 border-b">
                                <label className={`flex items-center space-x-2 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={bant?.budget_yes_no || false}
                                        onChange={(e) => {
                                            if (readOnly) return;
                                            onBantChange?.('budget_yes_no', e.target.checked);
                                            if (!e.target.checked) onChange?.('budget_allocated_score', 0);
                                        }}
                                        disabled={readOnly}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-medium text-gray-900">Budget Confirmed</span>
                                </label>
                            </div>
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div>
                                        <p className="font-medium text-gray-700">Allocated Budget</p>
                                        <p className="text-sm text-gray-500">Clear budgets allocated for purchase</p>
                                        {!bant?.budget_yes_no && <p className="text-xs text-amber-600 mt-0.5">Check "Budget Confirmed" to enable scoring</p>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end ml-2">
                                        <ScoreButton current={scores.budget_allocated_score} value={0} field="budget_allocated_score" extraDisabled={!bant?.budget_yes_no} />
                                        <ScoreButton current={scores.budget_allocated_score} value={1} field="budget_allocated_score" extraDisabled={!bant?.budget_yes_no} />
                                        <ScoreButton current={scores.budget_allocated_score} value={2} field="budget_allocated_score" extraDisabled={!bant?.budget_yes_no} />
                                    </div>
                                </div>
                                {bant?.budget_yes_no && (
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Allocated Budget Amount</label>
                                            <input
                                                type="text"
                                                value={bant.budget_allocated || ''}
                                                onChange={(e) => !readOnly && onBantChange?.('budget_allocated', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full p-2 border rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                placeholder="e.g., $50,000"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-700 mb-1">Approval Stage</label>
                                            <input
                                                type="text"
                                                value={bant.approval_stage || ''}
                                                onChange={(e) => !readOnly && onBantChange?.('approval_stage', e.target.value)}
                                                disabled={readOnly}
                                                className="w-full p-2 border rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                placeholder="e.g., Manager approval"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Authority Identified → Decision Maker */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="p-3 bg-gray-50 border-b">
                                <label className={`flex items-center space-x-2 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={bant?.authority_yes_no || false}
                                        onChange={(e) => {
                                            if (readOnly) return;
                                            onBantChange?.('authority_yes_no', e.target.checked);
                                            if (!e.target.checked) onChange?.('decision_maker_score', 0);
                                        }}
                                        disabled={readOnly}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-medium text-gray-900">Authority Identified</span>
                                </label>
                            </div>
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div>
                                        <p className="font-medium text-gray-700">Decision Maker</p>
                                        <p className="text-sm text-gray-500">Responsible person identified and engaged</p>
                                        {!bant?.authority_yes_no && <p className="text-xs text-amber-600 mt-0.5">Check "Authority Identified" to enable scoring</p>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end ml-2">
                                        <ScoreButton current={scores.decision_maker_score} value={0} field="decision_maker_score" extraDisabled={!bant?.authority_yes_no} />
                                        <ScoreButton current={scores.decision_maker_score} value={1} field="decision_maker_score" extraDisabled={!bant?.authority_yes_no} />
                                        <ScoreButton current={scores.decision_maker_score} value={2} field="decision_maker_score" extraDisabled={!bant?.authority_yes_no} />
                                    </div>
                                </div>
                                {bant?.authority_yes_no && (
                                    <div className="mt-3">
                                        <label className="block text-sm text-gray-700 mb-1">Decision Maker Details</label>
                                        <select
                                            value={bant.decision_maker || ''}
                                            onChange={(e) => !readOnly && onBantChange?.('decision_maker', e.target.value)}
                                            disabled={readOnly}
                                            className="w-full p-2 border rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Select Decision Maker</option>
                                            {contactOptions?.map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Need Established → Established Need */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="p-3 bg-gray-50 border-b">
                                <label className={`flex items-center space-x-2 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={bant?.need_yes_no || false}
                                        onChange={(e) => {
                                            if (readOnly) return;
                                            onBantChange?.('need_yes_no', e.target.checked);
                                            if (!e.target.checked) onChange?.('established_need_score', 0);
                                        }}
                                        disabled={readOnly}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-medium text-gray-900">Need Established</span>
                                </label>
                            </div>
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div>
                                        <p className="font-medium text-gray-700">Established Need</p>
                                        <p className="text-sm text-gray-500">Client recognizes the need for solution</p>
                                        {!bant?.need_yes_no && <p className="text-xs text-amber-600 mt-0.5">Check "Need Established" to enable scoring</p>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end ml-2">
                                        <ScoreButton current={scores.established_need_score} value={0} field="established_need_score" extraDisabled={!bant?.need_yes_no} />
                                        <ScoreButton current={scores.established_need_score} value={1} field="established_need_score" extraDisabled={!bant?.need_yes_no} />
                                        <ScoreButton current={scores.established_need_score} value={2} field="established_need_score" extraDisabled={!bant?.need_yes_no} />
                                    </div>
                                </div>
                                {bant?.need_yes_no && (
                                    <div className="mt-3">
                                        <label className="block text-sm text-gray-700 mb-1">Pain Points & Urgency</label>
                                        <textarea
                                            value={bant.pain_points_desc || ''}
                                            onChange={(e) => !readOnly && onBantChange?.('pain_points_desc', e.target.value)}
                                            disabled={readOnly}
                                            rows={3}
                                            className="w-full p-2 border rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            placeholder="Describe pain points and urgency"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timeline Defined → Prioritized Urgency */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="p-3 bg-gray-50 border-b">
                                <label className={`flex items-center space-x-2 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={bant?.timeline_yes_no || false}
                                        onChange={(e) => {
                                            if (readOnly) return;
                                            onBantChange?.('timeline_yes_no', e.target.checked);
                                            if (!e.target.checked) onChange?.('urgency_score', 0);
                                        }}
                                        disabled={readOnly}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-medium text-gray-900">Timeline Defined</span>
                                </label>
                            </div>
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div>
                                        <p className="font-medium text-gray-700">Prioritized Urgency</p>
                                        <p className="text-sm text-gray-500">Defined timelines for implementation</p>
                                        {!bant?.timeline_yes_no && <p className="text-xs text-amber-600 mt-0.5">Check "Timeline Defined" to enable scoring</p>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end ml-2">
                                        <ScoreButton current={scores.urgency_score} value={0} field="urgency_score" extraDisabled={!bant?.timeline_yes_no} />
                                        <ScoreButton current={scores.urgency_score} value={1} field="urgency_score" extraDisabled={!bant?.timeline_yes_no} />
                                        <ScoreButton current={scores.urgency_score} value={2} field="urgency_score" extraDisabled={!bant?.timeline_yes_no} />
                                    </div>
                                </div>
                                {bant?.timeline_yes_no && (
                                    <div className="mt-3">
                                        <label className="block text-sm text-gray-700 mb-1">Expected Closure Date</label>
                                        <DateOverlay value={bant.expected_closure_date}>
                                        <input
                                            type="date"
                                            value={bant.expected_closure_date || ''}
                                            onChange={(e) => !readOnly && onBantChange?.('expected_closure_date', e.target.value)}
                                            disabled={readOnly}
                                            min={new Date().toLocaleDateString('en-CA')}
                                            onClick={(e) => !readOnly && (e.currentTarget as any).showPicker?.()}
                                            className="w-full p-2 border rounded text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                        </DateOverlay>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* D. Other Key Info */}
            <div>
                <SectionHeader title="D. Other Key Info" sectionKey="otherInfo" total={otherInfoTotal} max={6} />
                {expandedSections.otherInfo && (
                    <div className="p-4">
                        <ScoreRow
                            label="Competition Presence"
                            field="competition_score"
                            description="No competition = 2 points, Competition exists = 0 points"
                            current={scores.competition_score}
                        />
                        <ScoreRow
                            label="Champion Within"
                            field="champion_score"
                            description="Champion within organization or group companies"
                            current={scores.champion_score}
                        />
                        <ScoreRow
                            label="Influencer Identified"
                            field="influencer_score"
                            description="Influencer (internal or external) identified"
                            current={scores.influencer_score}
                        />
                    </div>
                )}
            </div>

            {/* Overall Progress Bar */}
            <div className="p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Overall Score</span>
                    <span className="text-2xl font-bold text-blue-600">{overallTotal} / 28</span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                        style={{ width: `${(overallTotal / 28) * 100}%` }}
                    />
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">
                    {overallTotal < 10 && 'Early stage - needs qualification'}
                    {overallTotal >= 10 && overallTotal < 22 && 'Progressing - continue nurturing'}
                    {overallTotal >= 22 && 'Highly qualified - prioritize'}
                </p>
            </div>
        </div>
    );
}
