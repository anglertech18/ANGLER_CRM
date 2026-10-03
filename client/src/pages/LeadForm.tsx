import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Save, Calculator, History, ChevronDown, ChevronUp, Trash2, X, FileText, ExternalLink } from 'lucide-react';
import LeadScoreCard from '../components/LeadScoreCard';
import DateOverlay from '../components/DateOverlay';

// Sales Engagement Date & Time is stored tagged as UTC (see the engagementDate/
// engagementTime combine effect below) so the picked wall-clock value never
// drifts across save/reload regardless of server or browser timezone. It must
// therefore always be *displayed* by reading its UTC components too — using
// toLocaleString()/local Date getters here would re-introduce the same drift
// as a timezone-shifted display bug.
const formatLogDateTime = (value: any): string => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: '2-digit', second: '2-digit',
        hour12: true,
    });
};

export default function LeadForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = !!id;
    const location = useLocation();
    const sourceLeadId = new URLSearchParams(location.search).get('sourceLeadId');

    // Collapsible Section State
    const [sections, setSections] = useState({
        accountInfo: false,
        companyDetails: false,
        otherContacts: false,
        opportunity: false,
        engagement: false,
        scoreModule: false,
        bant: false,
        quadrant: false,
        followUp: false,
        attachDocuments: false,
        commercials: false,
        expectedOrder: false
    });

    const toggleSection = (section: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [section]: !prev[section] }));
    };


    // Fetch masters

    const { data: sbus } = useQuery({ queryKey: ['masters', 'sbu'], queryFn: () => api.get('/masters/sbu').then(r => r.data) });
    const { data: sources } = useQuery({ queryKey: ['masters', 'leadsource'], queryFn: () => api.get('/masters/leadsource').then(r => r.data) });
    const { data: industries } = useQuery({ queryKey: ['masters', 'industry'], queryFn: () => api.get('/masters/industry').then(r => r.data) });
    const { data: countries } = useQuery({ queryKey: ['masters', 'country'], queryFn: () => api.get('/masters/country').then(r => r.data) });

    const { data: allStates } = useQuery({ queryKey: ['masters', 'state'], queryFn: () => api.get('/masters/state').then(r => r.data) });
    const { data: allCities } = useQuery({ queryKey: ['masters', 'city'], queryFn: () => api.get('/masters/city').then(r => r.data) });
    const { data: allPersonas } = useQuery({ queryKey: ['masters', 'persona'], queryFn: () => api.get('/masters/persona').then(r => r.data) });

    const { data: collaterals } = useQuery({ queryKey: ['masters', 'collateral'], queryFn: () => api.get('/masters/collateral').then(r => r.data) });
    const { data: activities } = useQuery({ queryKey: ['masters', 'activity'], queryFn: () => api.get('/masters/activity').then(r => r.data) });
    const { data: salesStages } = useQuery({ queryKey: ['masters', 'salesStage'], queryFn: () => api.get('/masters/salesStage').then(r => r.data) });
    const { data: avatars } = useQuery({ queryKey: ['masters', 'avatar'], queryFn: () => api.get('/masters/avatar').then(r => r.data) });
    const { data: users } = useQuery({ queryKey: ['users', 'all'], queryFn: () => api.get('/users', { params: { all: 'true' } }).then(r => r.data) });
    const { data: bantCategories } = useQuery({ queryKey: ['masters', 'bant-categories'], queryFn: () => api.get('/masters/bant-categories').then(r => r.data) });
    const { data: verticals } = useQuery({ queryKey: ['masters', 'vertical'], queryFn: () => api.get('/masters/vertical').then(r => r.data) });
    const { data: paymentTypes } = useQuery({ queryKey: ['masters', 'paymenttype'], queryFn: () => api.get('/masters/paymenttype').then(r => r.data) });
    const { data: existingForecast } = useQuery({
        queryKey: ['cashflow-forecast', 'by-lead', id],
        queryFn: () => api.get(`/cashflow-forecast/by-lead/${id}`).then(r => r.data?.data),
        enabled: isEdit && !!id,
    });

    // Get current user from localStorage or context
    const currentUser = React.useMemo(() => {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }, []);

    // Fetch user's mapped products (must be after currentUser is defined)
    const { data: userTargets } = useQuery({
        queryKey: ['user-targets', currentUser?.id],
        queryFn: () => api.get(`/users/${currentUser!.id}/targets`).then(r => r.data),
        enabled: !!currentUser?.id
    });
    const products = React.useMemo(() =>
        (userTargets?.productTargets || []).map((pt: any) => pt.product).filter((p: any) => p?.is_active),
        [userTargets]
    );

    // Calculate default values for new leads
    const getDefaultValues = React.useMemo(() => {
        if (isEdit || !currentUser) return {};

        const defaults: any = {};

        // Default Sales SBU
        if (currentUser.sbu_id) {
            defaults.sales_sbu_id = currentUser.sbu_id.toString();
        }

        defaults.lead_owner_id = currentUser.id.toString();
        defaults.enquiry_date = new Date().toISOString().split('T')[0];

        return defaults;
    }, [currentUser, isEdit]);

    // Watch for dependent dropdowns
    const { register, handleSubmit, formState: { errors }, reset, watch, setValue, getValues } = useForm({
        defaultValues: getDefaultValues
    });
    const selectedCountryId = watch('country_id');
    const selectedStateId = watch('state_id');
    const selectedProductId = watch('product_id');
    const selectedSalesStageId = watch('sales_stage_id');
    const primaryFirstName = watch('first_name');
    const primaryLastName = watch('last_name');
    const primarySalutation = watch('salutation');
    const primaryAvatarId = watch('avatar_id');
    const primaryJobTitleName = watch('job_title_name');

    // Sales Engagement Date/Time (30-minute intervals)
    const [engagementDate, setEngagementDate] = useState('');
    const [engagementTime, setEngagementTime] = useState('');

    // Combine date+time into follow_up_datetime whenever either changes.
    // The picked date/time is a plain wall-clock value with no timezone concept
    // in this UI — it's tagged "Z" so `new Date(...)` (here and on the server)
    // reads it as that literal value instead of silently reinterpreting it in
    // whatever timezone the current process happens to run in. Without this,
    // the same picked time drifts on every save/reload whenever the browser's
    // and server's local timezones differ, which both showed the wrong time
    // back to the user and made every resave look like a "new" engagement
    // (retriggering a duplicate Activity Log entry).
    React.useEffect(() => {
        if (engagementDate && engagementTime) {
            setValue('follow_up_datetime', `${engagementDate}T${engagementTime}:00.000Z`);
        } else if (engagementDate) {
            setValue('follow_up_datetime', `${engagementDate}T00:00:00.000Z`);
        } else {
            setValue('follow_up_datetime', '');
        }
    }, [engagementDate, engagementTime, setValue]);

    // 30-minute interval time slots with 12-hour display labels, restricted to
    // business hours 8:00 AM – 8:00 PM.
    const TIME_SLOTS = React.useMemo(() => {
        const slots: { value: string; label: string }[] = [];
        for (let h = 8; h <= 20; h++) {
            const period = h < 12 ? 'AM' : 'PM';
            const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const value00 = `${String(h).padStart(2, '0')}:00`;
            slots.push({ value: value00, label: `${displayHour}:00 ${period}` });
            if (h < 20) {
                const value30 = `${String(h).padStart(2, '0')}:30`;
                slots.push({ value: value30, label: `${displayHour}:30 ${period}` });
            }
        }
        return slots;
    }, []);

    // Count type selected for the current product
    const [selectedCountType, setSelectedCountType] = useState<string>('');



    // Filter states by selected country
    const states = React.useMemo(() => {
        if (!selectedCountryId || !allStates) return [];
        return allStates.filter((s: any) => s.country_id === parseInt(selectedCountryId));
    }, [selectedCountryId, allStates]);

    // Filter cities by selected state
    const cities = React.useMemo(() => {
        if (!selectedStateId || !allCities) return [];
        return allCities.filter((c: any) => c.state_id === parseInt(selectedStateId));
    }, [selectedStateId, allCities]);

    // Filter personas by selected product
    const personas = React.useMemo(() => {
        if (!allPersonas || !selectedProductId) return [];
        const targetId = parseInt(selectedProductId);
        if (isNaN(targetId)) return [];
        return allPersonas.filter((p: any) => p.product_id === targetId);
    }, [selectedProductId, allPersonas]);

    // Get selected product to access count_type options
    const selectedProductOrService = React.useMemo(() => {
        if (selectedProductId && products) {
            return products.find((p: any) => p.id === parseInt(selectedProductId)) || null;
        }
        return null;
    }, [selectedProductId, products]);


    const leadOwners = React.useMemo(() => {
        if (!users) return [];
        return users;
    }, [users]);

    // Milestones State
    const [milestones, setMilestones] = useState<any[]>([]);
    const clampToastRef = useRef<number | undefined>(undefined);

    // Show a transient notice when a milestone value is capped on input.
    const flashMilestoneNotice = (msg: string) => {
        setMilestoneError(msg);
        window.clearTimeout(clampToastRef.current);
        clampToastRef.current = window.setTimeout(() => setMilestoneError(null), 4000);
    };

    const addMilestone = () => {
        const orderVal = parseFloat(watch('order_value') as any) || 0;
        if (orderVal <= 0) {
            flashMilestoneNotice('Enter Order Value before adding a milestone.');
            return;
        }
        setMilestones(prev => [...prev, { payment_type_id: '', percentage: '', expected_amount: '', edc: '' }]);
    };

    const removeMilestone = (index: number) => {
        setMilestones(prev => prev.filter((_, i) => i !== index));
        setMilestoneError(null);
    };

    const updateMilestone = (index: number, field: string, value: any) => {
        setMilestones(prev => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
        setMilestoneError(null);
    };

    const updateMilestonePercentage = (index: number, value: any) => {
        const orderVal = parseFloat(watch('order_value') as any) || 0;
        // Clamp so this row plus every other row's percentage never exceeds 100.
        const othersTotal = milestones.reduce((s, m, i) => i === index ? s : s + (parseFloat(m.percentage) || 0), 0);
        const remaining = Math.max(0, 100 - othersTotal);
        let clampMsg: string | null = null;
        if (value !== '' && (parseFloat(value) || 0) > remaining) {
            value = String(remaining);
            clampMsg = `Percentage capped at ${value}% — total across milestones cannot exceed 100%.`;
        }
        setMilestones(prev => {
            const next = [...prev];
            const current = next[index];
            const amount = orderVal > 0 && value !== '' ? ((orderVal * (parseFloat(value) || 0)) / 100).toFixed(2) : current.expected_amount;
            next[index] = { ...current, percentage: value, expected_amount: amount };
            return next;
        });
        if (clampMsg) flashMilestoneNotice(clampMsg); else setMilestoneError(null);
    };

    // Amount is the primary input (it is captured before percentage): typing it back-fills
    // the percentage whenever an Order Value is available to derive it from.
    const updateMilestoneAmount = (index: number, value: any) => {
        const orderVal = parseFloat(watch('order_value') as any) || 0;
        // Clamp so this row plus every other row never exceeds the Order Value.
        let clampMsg: string | null = null;
        if (orderVal > 0 && value !== '') {
            const othersAmt = milestones.reduce((s, m, i) => i === index ? s : s + (parseFloat(m.expected_amount) || 0), 0);
            const remainingAmt = Math.max(0, orderVal - othersAmt);
            if ((parseFloat(value) || 0) > remainingAmt) {
                value = remainingAmt.toFixed(2);
                clampMsg = `Expected Amount capped at ${value} — milestones cannot exceed the Order Value.`;
            }
        }
        setMilestones(prev => {
            const next = [...prev];
            const current = next[index];
            const percentage = orderVal > 0 && value !== ''
                ? (((parseFloat(value) || 0) / orderVal) * 100).toFixed(2)
                : current.percentage;
            next[index] = { ...current, expected_amount: value, percentage };
            return next;
        });
        if (clampMsg) flashMilestoneNotice(clampMsg); else setMilestoneError(null);
    };

    // Cashflow Forecast State (md files/forecast/forecast.md)
    const [forecastMilestones, setForecastMilestones] = useState<any[]>([]);
    const [forecastError, setForecastError] = useState<string | null>(null);
    const expectedOrder = watch('expected_order');

    const addForecastMilestone = () => {
        const expectedOrderValue = parseFloat(watch('forecast_expected_order_value') as any) || 0;
        if (expectedOrderValue <= 0) {
            flashForecastNotice('Enter Expected Order Value before adding a milestone.');
            return;
        }
        setForecastMilestones(prev => [...prev, { milestone_master_id: '', percentage: '', expected_amount: '', expected_collection_date: '', remarks: '' }]);
    };

    const removeForecastMilestone = (index: number) => {
        setForecastMilestones(prev => prev.filter((_, i) => i !== index));
        setForecastError(null);
    };

    // Show a transient notice when a forecast milestone value is capped on input.
    const flashForecastNotice = (msg: string) => {
        setForecastError(msg);
        window.clearTimeout(clampToastRef.current);
        clampToastRef.current = window.setTimeout(() => setForecastError(null), 4000);
    };

    const updateForecastMilestone = (index: number, field: string, value: any) => {
        if (field === 'expected_amount') {
            const expectedOrderValue = parseFloat(watch('forecast_expected_order_value') as any) || 0;
            let clampMsg: string | null = null;
            if (expectedOrderValue > 0 && value !== '') {
                const othersAmt = forecastMilestones.reduce((s, m, i) => i === index ? s : s + (parseFloat(m.expected_amount) || 0), 0);
                const remainingAmt = Math.max(0, expectedOrderValue - othersAmt);
                if ((parseFloat(value) || 0) > remainingAmt) {
                    value = remainingAmt.toFixed(2);
                    clampMsg = `Expected Amount capped at ${value} — milestones cannot exceed the Expected Order Value.`;
                }
            }
            const val = value;
            setForecastMilestones(prev => {
                const next = [...prev];
                const percentage = expectedOrderValue > 0 && val !== ''
                    ? (((parseFloat(val) || 0) / expectedOrderValue) * 100).toFixed(2)
                    : next[index].percentage;
                next[index] = { ...next[index], expected_amount: val, percentage };
                return next;
            });
            if (clampMsg) flashForecastNotice(clampMsg); else setForecastError(null);
            return;
        }
        setForecastMilestones(prev => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
        setForecastError(null);
    };

    const updateForecastMilestonePercentage = (index: number, value: any) => {
        const expectedOrderValue = parseFloat(watch('forecast_expected_order_value') as any) || 0;
        // Clamp so this row plus every other row's percentage never exceeds 100.
        const othersTotal = forecastMilestones.reduce((s, m, i) => i === index ? s : s + (parseFloat(m.percentage) || 0), 0);
        const remaining = Math.max(0, 100 - othersTotal);
        let clampMsg: string | null = null;
        if (value !== '' && (parseFloat(value) || 0) > remaining) {
            value = String(remaining);
            clampMsg = `Percentage capped at ${value}% — total across milestones cannot exceed 100%.`;
        }
        setForecastMilestones(prev => {
            const next = [...prev];
            const current = next[index];
            const amount = expectedOrderValue > 0 && value !== '' ? ((expectedOrderValue * (parseFloat(value) || 0)) / 100).toFixed(2) : current.expected_amount;
            next[index] = { ...current, percentage: value, expected_amount: amount };
            return next;
        });
        if (clampMsg) flashForecastNotice(clampMsg); else setForecastError(null);
    };

    // Prefill Cashflow Forecast fields/milestones when editing a lead that already has one
    useEffect(() => {
        if (!existingForecast) return;
        setValue('expected_order', true);
        setValue('forecast_expected_order_value', existingForecast.expected_order_value != null ? Number(existingForecast.expected_order_value) : '');
        setValue('forecast_expected_order_closure_date', existingForecast.expected_order_closure_date ? existingForecast.expected_order_closure_date.slice(0, 10) : '');
        setValue('forecast_device_count', existingForecast.device_count != null ? Number(existingForecast.device_count) : '');
        setValue('forecast_remarks', existingForecast.remarks || '');
        if (existingForecast.vertical_id) setValue('vertical_id', existingForecast.vertical_id.toString());
        setForecastMilestones((existingForecast.milestones || []).map((m: any) => ({
            id: m.id,
            milestone_master_id: m.milestone_master_id ? m.milestone_master_id.toString() : '',
            percentage: m.percentage != null ? m.percentage.toString() : '',
            expected_amount: m.expected_amount != null ? m.expected_amount.toString() : '',
            expected_collection_date: m.expected_collection_date ? m.expected_collection_date.slice(0, 10) : '',
            remarks: m.remarks || '',
        })));
    }, [existingForecast, setValue]);

    // ── Order Won prefill from the Cashflow Forecast ──
    // A forecasted lead has already had its order value, device count and milestone
    // plan agreed; when it lands on Order Won those are the same three things the
    // Order Won block asks for. Retyping them is both wasted work and a chance to
    // disagree with the forecast — and the forecast is deleted server-side the moment
    // the lead resolves to Order Won, so anything not carried across here is lost.
    // Everything filled stays fully editable afterwards.
    const [forecastPrefilled, setForecastPrefilled] = useState(false);
    // Fires once per entry into Order Won, so a user who deliberately clears a field
    // does not have it refilled on the next render.
    const orderWonPrefillDone = useRef(false);

    // Maps a forecast milestone onto a payment milestone. Both sides reference the
    // same PaymentType master (forecast calls it milestone_master_id), so the mapping
    // is one-to-one; only the EDC field is named differently.
    // A forecast may leave the amount blank — it is deliberately unvalidated there —
    // but a payment milestone must carry one, so it is derived from the percentage
    // where possible rather than handing the user a row that cannot be saved.
    const forecastMilestoneToPayment = (m: any, orderValue: number) => {
        const percentage = m.percentage != null ? Number(m.percentage) : null;
        const amount = m.expected_amount != null && m.expected_amount !== ''
            ? Number(m.expected_amount)
            : (percentage && orderValue > 0 ? (orderValue * percentage) / 100 : null);
        return {
            payment_type_id: m.milestone_master_id ? m.milestone_master_id.toString() : '',
            percentage: percentage != null ? percentage.toString() : '',
            expected_amount: amount != null ? amount.toFixed(2) : '',
            edc: m.expected_collection_date ? m.expected_collection_date.slice(0, 10) : '',
        };
    };

    // `force` is the explicit "Fill from forecast" button: it replaces whatever is in
    // the three fields. The automatic pass only fills what is still empty, so a lead
    // saved as Order Won once is never overwritten by its old forecast.
    const applyForecastToOrderWon = (force = false) => {
        if (!existingForecast) return;
        const currentOrderValue = parseFloat(watch('order_value') as any) || 0;
        const currentDevice = parseFloat(watch('sales_device') as any) || 0;

        if (force || !currentOrderValue) {
            setValue('order_value', existingForecast.expected_order_value != null ? Number(existingForecast.expected_order_value) : '');
        }
        if (force || !currentDevice) {
            setValue('sales_device', existingForecast.device_count != null ? Number(existingForecast.device_count) : '');
        }
        const orderValue = Number(existingForecast.expected_order_value) || 0;
        const planned = (existingForecast.milestones || []).map((m: any) => forecastMilestoneToPayment(m, orderValue));
        if (planned.length) {
            // Functional form so the "already has milestones" test reads the live state:
            // on an Order Won lead this can run in the same commit as the hydration that
            // loads the lead's own saved milestones, and those must always win.
            setMilestones(prev => (force || prev.length === 0 ? planned : prev));
        }
        if (existingForecast.vertical_id && (force || !watch('vertical_id'))) {
            setValue('vertical_id', existingForecast.vertical_id.toString());
        }
        setForecastPrefilled(true);
        setMilestoneError(null);
    };

    useEffect(() => {
        if (!existingForecast || !salesStages) return;
        const stageName = (salesStages as any[]).find((s: any) => s.id.toString() === selectedSalesStageId?.toString())?.name;
        if (stageName !== 'Order Won') {
            // Left the stage — arm the prefill again for the next time it is chosen.
            orderWonPrefillDone.current = false;
            setForecastPrefilled(false);
            return;
        }
        if (orderWonPrefillDone.current) return;
        orderWonPrefillDone.current = true;
        applyForecastToOrderWon(false);
    }, [selectedSalesStageId, salesStages, existingForecast]); // eslint-disable-line react-hooks/exhaustive-deps

    // Other Contacts State
    const [contacts, setContacts] = useState<any[]>([]);
    const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
    const [hasProductChanged, setHasProductChanged] = useState(false);

    const addContact = () => {
        setContacts([...contacts, { name: '', designation: '', email: '', contact_mobile: '', whatsapp: '', avatar_id: '' }]);
    };

    const removeContact = (index: number) => {
        setContacts(contacts.filter((_, i) => i !== index));
    };

    const updateContact = (index: number, field: string, value: any) => {
        const updated = [...contacts];
        updated[index][field] = value;
        setContacts(updated);
    };

    // Combine primary and secondary contacts for dropdowns
    const contactOptions = React.useMemo(() => {
        const options: string[] = [];

        // Helper to get avatar name
        const getAvatarName = (id: string | number) => {
            if (!id || !avatars) return '';
            const avatar = avatars.find((a: any) => a.id.toString() === id.toString());
            return avatar ? `--${avatar.name}` : '';
        };

        // Add primary contact
        if (primaryFirstName || primaryLastName) {
            const fullName = `${primarySalutation ? primarySalutation + ' ' : ''}${primaryFirstName || ''} ${primaryLastName || ''}`.trim();
            const designationStr = primaryJobTitleName ? ` - ${primaryJobTitleName}` : '';
            if (fullName) {
                options.push(`${fullName}${designationStr}${getAvatarName(primaryAvatarId)}`);
            }
        }

        // Add other contacts
        contacts.forEach(c => {
            if (c.name && c.name.trim()) {
                const designationStr = c.designation ? ` - ${c.designation}` : '';
                options.push(`${c.name.trim()}${designationStr}${getAvatarName(c.avatar_id)}`);
            }
        });

        // Unique options
        return Array.from(new Set(options));
    }, [primaryFirstName, primaryLastName, primarySalutation, contacts, primaryAvatarId, avatars, primaryJobTitleName]);



    const [scores, setScores] = useState({
        reduce_cost_score: 0,
        efficiency_score: 0,
        automation_score: 0,
        others_score: 0,
        others_score_label: '',
        compliance_score: 0,
        established_need_score: 0,
        urgency_score: 0,
        budget_allocated_score: 0,
        decision_maker_score: 0,
        competition_score: 0,
        champion_score: 0,
        influencer_score: 0,
        lead_source_quality: 0,
        decision_contact_score: 0
    });

    const [showScoreCard, setShowScoreCard] = useState(false);
    const [showFollowUpHistory, setShowFollowUpHistory] = useState(false);

    // Click-to-Requalify: ?focus=scorecard opens & scrolls straight to the Scorecard section
    const focusParam = new URLSearchParams(location.search).get('focus');
    useEffect(() => {
        if (focusParam !== 'scorecard') return;
        setSections(prev => ({ ...prev, scoreModule: true }));
        setShowScoreCard(true);
        const timer = setTimeout(() => {
            document.getElementById('lead-scorecard-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timer);
    }, [focusParam]);

    // Dynamic BANT Qualification state (Section 10)
    const [bantModalCategory, setBantModalCategory] = useState<{ id: number; code: string; name: string } | null>(null);
    const [bantLocalAnswers, setBantLocalAnswers] = useState<Record<number, string>>({});
    const [bantIsSaving, setBantIsSaving] = useState(false);
    // Draft answers for create mode: categoryId → (questionId → answer)
    const [bantDraftAnswers, setBantDraftAnswers] = useState<Record<number, Record<number, string>>>({});

    const { data: bantModalQuestions } = useQuery({
        queryKey: ['masters', 'bant-questions', bantModalCategory?.id],
        queryFn: () => api.get(`/masters/bant-questions?category_id=${bantModalCategory!.id}`).then(r => r.data),
        enabled: !!bantModalCategory,
    });

    const { data: bantLeadAnswersRaw, refetch: refetchBantAnswers } = useQuery({
        queryKey: ['leads', id, 'bant'],
        queryFn: () => api.get(`/leads/${id}/bant`).then(r => r.data),
        enabled: isEdit && !!id,
    });

    const bantSavedAnswerMap = React.useMemo(() => {
        if (!bantLeadAnswersRaw) return {} as Record<number, string>;
        const map: Record<number, string> = {};
        (bantLeadAnswersRaw as any[]).forEach((a) => { map[a.question_id] = a.answer || ''; });
        return map;
    }, [bantLeadAnswersRaw]);

    const bantAnsweredCategoryIds = React.useMemo(() => {
        if (isEdit) {
            if (!bantLeadAnswersRaw) return new Set<number>();
            return new Set<number>((bantLeadAnswersRaw as any[]).map((a) => a.category_id));
        }
        return new Set<number>(Object.keys(bantDraftAnswers).map(Number));
    }, [isEdit, bantLeadAnswersRaw, bantDraftAnswers]);

    const openBantModal = (cat: { id: number; code: string; name: string }) => {
        setBantModalCategory(cat);
        // In create mode, pre-populate from draft so user sees previously entered answers
        setBantLocalAnswers(isEdit ? {} : (bantDraftAnswers[cat.id] || {}));
    };

    const closeBantModal = () => {
        setBantModalCategory(null);
        setBantLocalAnswers({});
    };

    const saveBantAnswers = async () => {
        if (!bantModalCategory || !bantModalQuestions) return;
        setBantIsSaving(true);
        try {
            const answers = (bantModalQuestions as any[]).map((q) => ({
                question_id: q.id,
                answer: bantLocalAnswers[q.id] ?? (isEdit ? bantSavedAnswerMap[q.id] : bantDraftAnswers[bantModalCategory.id]?.[q.id]) ?? '',
            }));
            if (isEdit) {
                await api.post(`/leads/${id}/bant`, { category_id: bantModalCategory.id, answers });
                await refetchBantAnswers();
            } else {
                // Store locally; will be submitted after lead is created
                const answerMap: Record<number, string> = {};
                answers.forEach((a) => { answerMap[a.question_id] = a.answer; });
                setBantDraftAnswers(prev => ({ ...prev, [bantModalCategory.id]: answerMap }));
            }
            closeBantModal();
        } catch (err) {
            console.error('Failed to save BANT answers:', err);
        } finally {
            setBantIsSaving(false);
        }
    };

    // BANT State — used for quadrant calculation and form submission; UI is in Section 5 → Part C scorecard
    const [bant, setBant] = useState({
        budget_yes_no: false,
        budget_allocated: '',
        approval_stage: '',
        authority_yes_no: false,
        decision_maker: '',
        need_yes_no: false,
        pain_points_desc: '',
        timeline_yes_no: false,
        expected_closure_date: ''
    });

    // Quadrant State
    const [quadrant, setQuadrant] = useState<string>('');
    const [isManualQuadrant, setIsManualQuadrant] = useState(false);

    // Validation Error State
    const [formError, setFormError] = useState<string | null>(null);
    const [milestoneError, setMilestoneError] = useState<string | null>(null);

    // CP Score Watch (Section 8)
    const watchedCpFields = watch([
        'authority_champion_influencer_identified',
        'demo_done_authority',
        'probing_discussion_authority',
        'direct_visit_authority',
        'post_demo_feedback_sent',
        'post_demo_feedback_received',
        'pilot_given',
        'mgmt_call_completed',
        'utilized_mgmt_urgency',
        'utilized_presales_timeline'
    ]);

    const cpScore = React.useMemo(() => {
        let score = 0;
        watchedCpFields.forEach(val => {
            if (val === true || val === 'true') score += 1;
        });
        return score;
    }, [watchedCpFields]);

    // Manual File State
    const [painPointsFiles, setPainPointsFiles] = useState<FileList | null>(null);
    const [orderWonAttachment, setOrderWonAttachment] = useState<FileList | null>(null);
    const [postDemoFeedbackFile, setPostDemoFeedbackFile] = useState<FileList | null>(null);

    // Dynamic Documents State
    const [dynamicDocuments, setDynamicDocuments] = useState<{ description: string, file: File | null }[]>([
        { description: '', file: null }
    ]);

    const addDocumentRow = () => {
        setDynamicDocuments([...dynamicDocuments, { description: '', file: null }]);
    };

    const removeDocumentRow = (index: number) => {
        setDynamicDocuments(dynamicDocuments.filter((_, i) => i !== index));
    };

    const updateDocumentRow = (index: number, field: 'description' | 'file', value: any) => {
        const updated = [...dynamicDocuments];
        updated[index][field] = value;
        setDynamicDocuments(updated);
    };



    // Close dropdown on click away

    // Helper: Calculate Total Score
    // Must mirror the 14 criteria summed by calculateLeadScore() in server/src/utils/leadScoring.ts
    // (lead_source_quality doesn't end in "_score" so a generic key-suffix reduce silently drops it).
    const calculateTotalScore = (currentScores: typeof scores) => {
        return (
            (currentScores.reduce_cost_score || 0) +
            (currentScores.efficiency_score || 0) +
            (currentScores.automation_score || 0) +
            (currentScores.others_score || 0) +
            (currentScores.compliance_score || 0) +
            (currentScores.established_need_score || 0) +
            (currentScores.urgency_score || 0) +
            (currentScores.budget_allocated_score || 0) +
            (currentScores.decision_maker_score || 0) +
            (currentScores.competition_score || 0) +
            (currentScores.champion_score || 0) +
            (currentScores.influencer_score || 0) +
            (currentScores.lead_source_quality || 0) +
            (currentScores.decision_contact_score || 0)
        );
    };

    // Helper: Calculate Quadrant
    const calculateQuadrant = (currentScores: typeof scores, currentBant: typeof bant) => {
        const score = calculateTotalScore(currentScores);
        const { budget_yes_no, authority_yes_no, need_yes_no, timeline_yes_no } = currentBant;

        // Q4 (Hot): Score > 20 and Budget – Yes, Authority – Yes, Need – Yes, Timeline – Yes
        if (score > 20 && budget_yes_no && authority_yes_no && need_yes_no && timeline_yes_no) {
            return 'Q4';
        }

        // Q3 (Warm): Score 11-20 and Budget – Yes, Authority – Yes, Need – Yes, Timeline – No
        if (score >= 11 && score <= 20 && budget_yes_no && authority_yes_no && need_yes_no && !timeline_yes_no) {
            return 'Q3';
        }

        // Q2 (Progressing): Score 11-20 and Budget – No, Authority – No, Need – Yes, Timeline - Yes
        if (score >= 11 && score <= 20 && !budget_yes_no && !authority_yes_no && need_yes_no && timeline_yes_no) {
            return 'Q2';
        }

        // Q1 (Interested): Score < 10 and Budget – No, Authority – No, Need – No, Timeline - No
        if (score < 10 && !budget_yes_no && !authority_yes_no && !need_yes_no && !timeline_yes_no) {
            return 'Q1';
        }

        // Default fallback
        if (score >= 21) return 'Q4';
        if (score >= 11) return 'Q2';
        return 'Q1';
    };


    // Fetch existing lead data when editing
    const { data: existingLead, isLoading: loadingLead } = useQuery({
        queryKey: ['leads', id],
        queryFn: async () => {
            if (!id) return null;
            const res = await api.get(`/leads/${id}`);
            return res.data;
        },
        enabled: !!id
    });

    // Tracks which lead id's data has already been loaded into local form/score/BANT state.
    // Without this guard, React Query's default background refetch (e.g. on window focus)
    // re-runs the hydration effect below and silently overwrites any in-progress, unsaved
    // checkbox/score edits with the last-saved server values.
    const hydratedLeadIdRef = useRef<number | null>(null);

    // Reset persona when product changes and trigger modal
    useEffect(() => {
        const isInitialEditLoad = isEdit && existingLead &&
            (selectedProductId || '') === (existingLead.product_id?.toString() || '');

        // Only clear persona and open modal when product actively changes (not on initial edit load)
        if (!isInitialEditLoad) {
            if (selectedProductId && !isEdit) {
                setIsPersonaModalOpen(true);
            }
            setValue('persona_id', '');
            setContacts(prev => prev.map(c => ({ ...c, persona_id: '' })));
        }

        // Always set count type from product — skip only if products haven't loaded yet
        if (selectedProductId && products.length > 0) {
            const product = products.find((p: any) => p.id === parseInt(selectedProductId));
            setSelectedCountType(product?.count_type ? product.count_type.trim() : '');
        } else if (!selectedProductId) {
            setSelectedCountType('');
        }
        // If products is still empty, do nothing — effect will re-run once products load
    }, [selectedProductId, isEdit, setValue, existingLead, products]);

    // Fetch source lead data when creating from existing (same company)
    const { data: sourceLead } = useQuery({
        queryKey: ['leads', sourceLeadId],
        queryFn: async () => {
            if (!sourceLeadId) return null;
            const res = await api.get(`/leads/${sourceLeadId}`);
            return res.data;
        },
        enabled: !!sourceLeadId && !isEdit
    });

    // Set defaults after master data loads (for new leads only)
    useEffect(() => {
        if (!isEdit && currentUser && sbus && users) {
            // Default Sales SBU
            if (currentUser.sbu_id) {
                setValue('sales_sbu_id', currentUser.sbu_id.toString());
            }

            setValue('lead_owner_id', currentUser.id.toString());
        }
    }, [isEdit, currentUser, sbus, users, setValue]);

    // Pre-fill form when editing
    useEffect(() => {
        if (existingLead && isEdit && hydratedLeadIdRef.current !== existingLead.id) {
            hydratedLeadIdRef.current = existingLead.id;
            // Cashflow Forecast fields may have already been hydrated from the
            // /cashflow-forecast/by-lead query (its own async fetch, no fixed
            // arrival order vs. this lead query) — carry those over so this
            // reset() doesn't wipe them out when it resolves second.
            const preservedForecast = getValues();
            // Reset form fields with existing data
            reset({
                salutation: existingLead.salutation || '',
                first_name: existingLead.first_name || '',
                last_name: existingLead.last_name || '',
                company_name: existingLead.company_name || existingLead.company_master?.name || '',
                sales_sbu_id: existingLead.sales_sbu_id ? existingLead.sales_sbu_id.toString() : '',
                lead_owner_id: existingLead.lead_owner_id ? existingLead.lead_owner_id.toString() : '',
                job_title_name: existingLead.job_title?.name || existingLead.job_title_name || '',
                lead_source_id: existingLead.lead_source_id ? existingLead.lead_source_id.toString() : '',
                enquiry_date: existingLead.enquiry_date ? existingLead.enquiry_date.slice(0, 10) : '',
                industry_id: existingLead.industry_id ? existingLead.industry_id.toString() : '',
                email: existingLead.email || '',
                mobile_number: existingLead.mobile_number || '',
                whatsapp_number: existingLead.whatsapp_number || '',
                website: existingLead.website || '',
                country_id: existingLead.country_id ? existingLead.country_id.toString() : '',
                state_id: existingLead.state_id ? existingLead.state_id.toString() : '',
                city_id: existingLead.city_id ? existingLead.city_id.toString() : '',
                address: existingLead.address || '',
                pin_code: existingLead.pin_code || '',
                other_info: existingLead.other_info || '',
                annual_turnover: existingLead.annual_turnover || '',
                product_id: existingLead.product_id ? existingLead.product_id.toString() : '',
                project_name: existingLead.project_name || '',
                avatar_id: existingLead.avatar_id ? existingLead.avatar_id.toString() : '',
                persona_id: existingLead.persona_id ? existingLead.persona_id.toString() : '',
                where_find_them_id: existingLead.where_find_them_id ? existingLead.where_find_them_id.toString() : '',
                telecalling_qualified: existingLead.telecalling_qualified?.toString() || '',
                // New Fields
                license_count: existingLead.license_count || existingLead.device_count || existingLead.employee_count || existingLead.vendor_count || '',
                collaterals: existingLead.collaterals?.map((c: any) => c.id.toString()) || [],
                demo_completed: existingLead.demo_completed ? 'true' : 'false',
                pilot_provided: existingLead.pilot_provided ? 'true' : 'false',
                requirement_desc: existingLead.requirement_desc || '',
                pain_points: existingLead.pain_points || '',
                competitor_details: existingLead.competitor_details || '',
                opportunities_values: existingLead.opportunities_values || '',
                // Section 5: Engagement
                authority_champion_influencer_identified: !!existingLead.authority_champion_influencer_identified,
                demo_done_authority: !!existingLead.demo_done_authority,
                post_demo_feedback_sent: !!existingLead.post_demo_feedback_sent,
                post_demo_feedback_received: !!existingLead.post_demo_feedback_received,
                probing_discussion_authority: !!existingLead.probing_discussion_authority,
                direct_visit_authority: !!existingLead.direct_visit_authority,
                pilot_given: !!existingLead.pilot_given,
                mgmt_call_completed: !!existingLead.mgmt_call_completed,
                utilized_mgmt_urgency: !!existingLead.utilized_mgmt_urgency,
                utilized_presales_timeline: !!existingLead.utilized_presales_timeline,
                // Follow Up & Sales Stage
                sales_stage_id: existingLead.sales_stage_id ? existingLead.sales_stage_id.toString() : '',
                next_activity_id: existingLead.next_activity_id ? existingLead.next_activity_id.toString() : '',
                next_activity_datetime: existingLead.next_activity_datetime ? existingLead.next_activity_datetime.slice(0, 16) : '', // format for datetime-local
                follow_up_activity_id: '', // ACTS AS "ADD NEW" - start empty
                follow_up_datetime: '',    // ACTS AS "ADD NEW" - start empty
                is_farming: existingLead.is_farming || false,
                order_won_date: existingLead.order_won_at ? new Date(existingLead.order_won_at).toISOString().slice(0, 10) : '',
                vertical_id: existingLead.vertical_id ? existingLead.vertical_id.toString() : (preservedForecast.vertical_id || ''),
                expected_order: preservedForecast.expected_order || false,
                forecast_expected_order_value: preservedForecast.forecast_expected_order_value ?? '',
                forecast_expected_order_closure_date: preservedForecast.forecast_expected_order_closure_date ?? '',
                forecast_device_count: preservedForecast.forecast_device_count ?? '',
                forecast_remarks: preservedForecast.forecast_remarks || '',
            });

            // Restore selected count type
            if (existingLead.custom_count_type) {
                setSelectedCountType(existingLead.custom_count_type);
            }

            // Set follow_up details from latest log if history exists
            if (existingLead.follow_up_logs && existingLead.follow_up_logs.length > 0) {
                const latestLog = existingLead.follow_up_logs[0];
                // Mapping Requirement: Current Activity defaults to previous log's Next Activity
                setValue('follow_up_activity_id', latestLog.next_activity_id ? latestLog.next_activity_id.toString() : '');
                // Pre-fill Sales Engagement Date & Time from latest log
                if (latestLog.date) {
                    const logDt = new Date(latestLog.date).toISOString();
                    setEngagementDate(logDt.slice(0, 10));
                    setEngagementTime(logDt.slice(11, 16) || '');
                }
                setValue('follow_up_notes', latestLog.notes || '');
            } else if (existingLead.follow_up_datetime) {
                // Fallback: use the lead's stored follow_up_datetime
                const dt = existingLead.follow_up_datetime;
                setEngagementDate(dt.slice(0, 10));
                setEngagementTime(dt.slice(11, 16) || '');
            }

            // Set milestones if they exist
            if (existingLead.milestones && existingLead.milestones.length > 0) {
                setMilestones(existingLead.milestones.map((m: any) => ({
                    id: m.id,
                    payment_type_id: m.payment_type_id ? m.payment_type_id.toString() : '',
                    percentage: m.percentage != null ? m.percentage.toString() : '',
                    expected_amount: m.expected_amount != null ? m.expected_amount.toString() : '',
                    edc: m.edc ? m.edc.slice(0, 10) : '',
                })));
            }

            // Set contacts if they exist
            if (existingLead.contacts && existingLead.contacts.length > 0) {
                const loadedContacts = existingLead.contacts.map((lc: any) => ({
                    name: lc.name || '',
                    designation: lc.designation || '',
                    email: lc.email || '',
                    contact_mobile: lc.contact_mobile || '',
                    whatsapp: lc.whatsapp || '',
                    avatar_id: lc.avatar_id ? lc.avatar_id.toString() : '',
                    persona_id: lc.persona_id ? lc.persona_id.toString() : ''
                }));
                setContacts(loadedContacts);
            }

            // Set score card values
            const loadedScores = {
                reduce_cost_score: existingLead.reduce_cost_score || 0,
                efficiency_score: existingLead.efficiency_score || 0,
                automation_score: existingLead.automation_score || 0,
                others_score: existingLead.others_score || 0,
                others_score_label: existingLead.others_score_label || '',
                compliance_score: existingLead.compliance_score || 0,
                established_need_score: existingLead.established_need_score || 0,
                urgency_score: existingLead.urgency_score || 0,
                budget_allocated_score: existingLead.budget_allocated_score || 0,
                decision_maker_score: existingLead.decision_maker_score || 0,
                competition_score: existingLead.competition_score || 0,
                champion_score: existingLead.champion_score || 0,
                influencer_score: existingLead.influencer_score || 0,
                lead_source_quality: existingLead.lead_source_quality || 0,
                decision_contact_score: existingLead.decision_contact_score || 0
            };
            setScores(loadedScores);

            // Set BANT values
            const loadedBant = {
                budget_yes_no: existingLead.budget_yes_no === true || existingLead.budget_yes_no === 'true',
                budget_allocated: existingLead.budget_allocated || '',
                approval_stage: existingLead.approval_stage || '',
                authority_yes_no: existingLead.authority_yes_no === true || existingLead.authority_yes_no === 'true',
                decision_maker: existingLead.decision_maker || '',
                need_yes_no: existingLead.need_yes_no === true || existingLead.need_yes_no === 'true',
                pain_points_desc: existingLead.pain_points_desc || '',
                timeline_yes_no: existingLead.timeline_yes_no === true || existingLead.timeline_yes_no === 'true',
                expected_closure_date: existingLead.expected_closure_date ? existingLead.expected_closure_date.slice(0, 10) : ''
            };
            setBant(loadedBant);

            // Set Quadrant
            if (existingLead.quadrant) {
                setQuadrant(existingLead.quadrant);
                // Check if it was manually set (heuristic: differs from calculated)
                const calculated = calculateQuadrant(loadedScores, loadedBant);
                if (existingLead.quadrant !== calculated) {
                    setIsManualQuadrant(true);
                }
            } else {
                setQuadrant(calculateQuadrant(loadedScores, loadedBant));
            }
        }
    }, [existingLead, isEdit, reset]);

    // Pre-fill form when creating from existing lead
    useEffect(() => {
        if (sourceLead && sourceLeadId && !isEdit) {
            reset({
                ...getDefaultValues,
                salutation: sourceLead.salutation || '',
                first_name: sourceLead.first_name || '',
                last_name: sourceLead.last_name || '',
                company_name: sourceLead.company_name || sourceLead.company_master?.name || '',
                company_id: sourceLead.company_id ? sourceLead.company_id.toString() : '',
                job_title_name: sourceLead.job_title?.name || sourceLead.job_title_name || '',
                lead_source_id: sourceLead.lead_source_id ? sourceLead.lead_source_id.toString() : '',
                industry_id: sourceLead.industry_id ? sourceLead.industry_id.toString() : '',
                email: sourceLead.email || '',
                mobile_number: sourceLead.mobile_number || '',
                whatsapp_number: sourceLead.whatsapp_number || '',
                website: sourceLead.website || '',
                country_id: sourceLead.country_id ? sourceLead.country_id.toString() : '',
                state_id: sourceLead.state_id ? sourceLead.state_id.toString() : '',
                city_id: sourceLead.city_id ? sourceLead.city_id.toString() : '',
                address: sourceLead.address || '',
                pin_code: sourceLead.pin_code || '',
                annual_turnover: sourceLead.annual_turnover || '',
                avatar_id: sourceLead.avatar_id ? sourceLead.avatar_id.toString() : ''
            });
        }
    }, [sourceLead, sourceLeadId, isEdit, reset, getDefaultValues]);

    // Pre-fill from Call Tracker
    useEffect(() => {
        if (location.state?.fromCallTracker && location.state?.callData && !isEdit) {
            const cd = location.state.callData;
            console.log('Pre-filling from Call Tracker:', cd);

            reset({
                ...getDefaultValues,
                company_name: cd.company_name || '',
                first_name: cd.contact_person_name || '', // Mapping contact person to first name
                email: cd.email_address || '',
                mobile_number: cd.mobile_no || '',
                address: cd.location || '',
                product_id: cd.product_id ? cd.product_id.toString() : '',
                industry_id: cd.industry_id ? cd.industry_id.toString() : '',
                other_info: `Imported from Call Tracker.\nDesignation: ${cd.designation || 'N/A'}\nBusiness Potential: ${cd.business_potential || 'N/A'}\nRemarks: ${cd.remarks || 'N/A'}`
            });

            // Set Quadrant
            if (cd.moved_to_quad) {
                setQuadrant(cd.moved_to_quad);
                setIsManualQuadrant(true);
            }
        }
    }, [location.state, isEdit, reset, getDefaultValues]);

    // Auto-calculate quadrant when scores or bant change (unless manual)
    useEffect(() => {
        if (!isManualQuadrant) {
            const newQuadrant = calculateQuadrant(scores, bant);
            setQuadrant(newQuadrant);
        }
    }, [scores, bant, isManualQuadrant]);

    // --- Decoupled Sync Logic for Sales Stage & Quadrant ---

    // 1. Stage -> Quadrant Sync
    // "Order Won" or "Order Lost" stage forces the quadrant to match.
    // Changing away resets the manual override so scores/BANT recalculate.
    useEffect(() => {
        if (!salesStages) return;
        const orderWonStage = salesStages.find((s: any) => s.name === 'Order Won');
        const orderLostStage = salesStages.find((s: any) => s.name === 'Order Lost');
        const orderNurturingStage = salesStages.find((s: any) => s.name === 'Nurturing');


        const isStageOrderWon = orderWonStage && selectedSalesStageId?.toString() === orderWonStage.id.toString();
        const isStageOrderLost = orderLostStage && selectedSalesStageId?.toString() === orderLostStage.id.toString();
        const isStageNurturing = orderNurturingStage && selectedSalesStageId?.toString() === orderNurturingStage.id.toString();
        

        if (isStageOrderWon) {
            if (quadrant !== 'Order Won') {
                setQuadrant('Order Won');
                setIsManualQuadrant(true);
            }
            // Default Order Won Date to today the first time the stage resolves to
            // Order Won; leaves it alone once a value exists (edit reload, or the
            // user already changed it) so we never clobber a deliberate edit.
            if (!getValues('order_won_date')) {
                setValue('order_won_date', new Date().toISOString().split('T')[0]);
            }
        } else if (isStageOrderLost) {
            if (quadrant !== 'Order Lost') {
                setQuadrant('Order Lost');
                setIsManualQuadrant(true);
            }
        } 
        else if (isStageNurturing) {
            if (quadrant !== 'Nurturing') {
                setQuadrant('Nurturing');
                setIsManualQuadrant(true);
            }
        }
        else {
            // Stage changed away from a terminal stage — allow recalculation
            if (quadrant === 'Order Won' || quadrant === 'Order Lost' || quadrant === 'Nurturing') {
                setIsManualQuadrant(false);
            }
        }
    }, [selectedSalesStageId, salesStages]); // Removed quadrant from deps to avoid fighting

    // 2. Quadrant -> Stage Sync
    // "Order Won" / "Order Lost" quadrant forces the matching stage.
    useEffect(() => {
        if (!salesStages || !isManualQuadrant) return;
        if (quadrant === 'Order Won') {
            const orderWonStage = salesStages.find((s: any) => s.name === 'Order Won');
            if (orderWonStage && selectedSalesStageId?.toString() !== orderWonStage.id.toString()) {
                setValue('sales_stage_id', orderWonStage.id.toString());
            }
        } else if (quadrant === 'Order Lost') {
            const orderLostStage = salesStages.find((s: any) => s.name === 'Order Lost');
            if (orderLostStage && selectedSalesStageId?.toString() !== orderLostStage.id.toString()) {
                setValue('sales_stage_id', orderLostStage.id.toString());
            }
        }
    }, [quadrant, isManualQuadrant, salesStages, setValue]);

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            // Extract special fields that need separate API calls
            const dynDocs = data.dynamicDocuments;
            const newNegotiationLog = data.new_negotiation_log;

            // Remove them from main payload to avoid clutter/errors in main endpoint
            if (data.dynamicDocuments) delete data.dynamicDocuments;
            if (data.new_negotiation_log) delete data.new_negotiation_log;

            let leadId = id;
            let response;

            const hasPainPointsUpload = data.pain_points_files && data.pain_points_files instanceof FileList && data.pain_points_files.length > 0;
            const hasOrderWonUpload = data.order_won_attachment && data.order_won_attachment instanceof FileList && data.order_won_attachment.length > 0;

            if (hasPainPointsUpload || hasOrderWonUpload) {
                // Use FormData for file upload
                const formData = new FormData();

                // Append pain points files
                if (hasPainPointsUpload) {
                    for (let i = 0; i < data.pain_points_files.length; i++) {
                        formData.append('pain_points_files', data.pain_points_files[i]);
                    }
                }

                // Append order won attachment
                if (hasOrderWonUpload) {
                    formData.append('order_won_attachment', data.order_won_attachment[0]);
                }

                // Append all other fields
                Object.keys(data).forEach(key => {
                    if (key === 'pain_points_files' || key === 'order_won_attachment') return;

                    const value = data[key];
                    // Skip null/undefined/empty
                    if (value === null || value === undefined || value === '') return;

                    // Skip any FileList objects (they are handled elsewhere or are empty)
                    if (value instanceof FileList) return;

                    // Stringify objects/arrays (like contacts)
                    if (typeof value === 'object') {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, String(value));
                    }
                });

                if (isEdit) {
                    response = await api.put(`/leads/${id}`, formData);
                } else {
                    response = await api.post('/leads', formData);
                }
            } else {
                // Regular JSON submission (no file)
                // Remove all FileList objects (they are handled separately or would cause Prisma/Multer errors)
                Object.keys(data).forEach(key => {
                    if (data[key] instanceof FileList) delete data[key];
                });

                // Convert empty strings to null for optional fields
                Object.keys(data).forEach(key => {
                    if (data[key] === '' || data[key] === 'undefined') {
                        data[key] = null;
                    }
                });

                // Convert IDs to integers
                ['company_id', 'sales_sbu_id', 'lead_source_id', 'industry_id', 'country_id',
                    'state_id', 'city_id', 'job_title_id', 'product_id', 'persona_id',
                    'where_find_them_id', 'sales_stage_id', 'next_activity_id', 'follow_up_activity_id',
                    'lead_owner_id', 'vertical_id'].forEach(key => {
                        if (data[key] && data[key] !== null) {
                            data[key] = parseInt(data[key]);
                        }
                    });

                // Convert score fields to integers
                ['reduce_cost_score', 'efficiency_score', 'automation_score', 'others_score',
                    'established_need_score', 'urgency_score', 'budget_allocated_score', 'decision_maker_score',
                    'competition_score', 'champion_score', 'influencer_score',
                    'lead_source_quality', 'decision_contact_score'].forEach(key => {
                        if (data[key] !== undefined && data[key] !== null) {
                            data[key] = parseInt(data[key]);
                        }
                    });

                // Quadrant is fully system-controlled (auto-calculated server-side)

                if (isEdit) {
                    response = await api.put(`/leads/${id}`, data);
                } else {
                    response = await api.post('/leads', data);
                }
            }

            // If it was a new lead, get the ID
            if (!isEdit && response?.data?.id) {
                leadId = response.data.id;
            }

            // Get latestFollowUpLogId from response
            const latestFollowUpLogId = response.data.latestFollowUpLogId;

            // --- Post-Save Operations for Sub-resources ---

            // 1. Upload New Documents (Proposal + Estimation)
            if (dynDocs && Array.isArray(dynDocs)) {
                for (const doc of dynDocs) {
                    if (doc.file) {
                        const docFormData = new FormData();
                        docFormData.append('file', doc.file);
                        docFormData.append('description', doc.description || 'Uploaded via Lead Form');
                        if (latestFollowUpLogId) {
                            docFormData.append('follow_up_log_id', String(latestFollowUpLogId));
                        }
                        try {
                            await api.post(`/leads/${leadId}/documents`, docFormData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            });
                        } catch (e) {
                            console.error('Failed to upload document:', doc.file.name, e);
                        }
                    }
                }
            }

            // 2. Add Pricing Negotiation Log
            if (newNegotiationLog && typeof newNegotiationLog === 'string' && newNegotiationLog.trim() !== '') {
                try {
                    await api.post(`/leads/${leadId}/pricing-negotiations`, {
                        details: newNegotiationLog,
                        date: new Date().toISOString()
                    });
                } catch (e) {
                    console.error('Failed to add negotiation log', e);
                }
            }

            // 3. Submit BANT draft answers collected during create mode
            if (!isEdit && Object.keys(bantDraftAnswers).length > 0) {
                for (const [categoryIdStr, answerMap] of Object.entries(bantDraftAnswers)) {
                    const categoryId = Number(categoryIdStr);
                    const answers = Object.entries(answerMap).map(([qId, answer]) => ({
                        question_id: Number(qId),
                        answer,
                    }));
                    try {
                        await api.post(`/leads/${leadId}/bant`, { category_id: categoryId, answers });
                    } catch (e) {
                        console.error('Failed to submit BANT draft for category', categoryId, e);
                    }
                }
            }

            // 4. Save milestones. A rejection here used to be swallowed, so the lead
            // saved and navigated away while its payment plan silently did not — the
            // message is surfaced instead.
            if (leadId && milestones.length > 0) {
                try {
                    await api.post(`/leads/${leadId}/milestones`, { milestones });
                } catch (e: any) {
                    const msg = e?.response?.data?.message || 'Failed to save payment milestones.';
                    console.error('Failed to save milestones', e);
                    setMilestoneError(msg);
                    setFormError(msg);
                    throw e;
                }
            }

            // 5. Save Cashflow Forecast (only while lead hasn't resolved to Order Won/Lost
            // — the server rejects a forecast on a won/lost lead, and has just deleted
            // the one this lead had).
            const orderResolved = quadrant === 'Order Won' || quadrant === 'Order Lost';
            if (leadId && !orderResolved && (data.expected_order === true || data.expected_order === 'true')) {
                try {
                    await api.post('/cashflow-forecast', {
                        lead_id: leadId,
                        expected_order_value: data.forecast_expected_order_value,
                        expected_order_closure_date: data.forecast_expected_order_closure_date || null,
                        device_count: data.forecast_device_count,
                        vertical_id: data.vertical_id || null,
                        remarks: data.forecast_remarks || null,
                        milestones: forecastMilestones,
                    });
                } catch (e: any) {
                    // A rejection here used to be swallowed (console.error only), so the
                    // lead saved and navigated away while an edited forecast milestone
                    // silently failed to persist. Surfaced the same way as the payment
                    // milestones save above.
                    const msg = e?.response?.data?.message || 'Failed to save cashflow forecast.';
                    console.error('Failed to save forecast', e);
                    setForecastError(msg);
                    setFormError(msg);
                    throw e;
                }
            }

            return response.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['leads'] });
            navigate('/leads');
        },
        onError: (error: any) => {
            console.error('Lead save failed:', error);
            const status = error.response?.status;
            let errorMsg = error.response?.data?.message || error.response?.data?.details || error.response?.data?.error || error.message;

            // A 4xx is the server telling the user what to fix — it is shown verbatim.
            // Only server faults are sanitized, and only when the text is genuinely
            // internal: blanket-replacing every message is what turned a re-pick-the-City
            // problem into an unactionable "internal server error".
            if (status >= 500 && /prisma|invocation|database|sql/i.test(String(errorMsg))) {
                errorMsg = 'An internal server error occurred. Please contact support if the issue persists.';
            }

            // Both channels: the alert cannot be missed, and the banner keeps the reason
            // on screen while the user fixes the field.
            setFormError(errorMsg);
            alert(`Failed to save lead: ${errorMsg}`);
        }
    });

    // Inline Status edit on a Sales Engagement & Activity Log row
    const [logStatusSavingId, setLogStatusSavingId] = useState<number | null>(null);
    const followUpLogStatusMutation = useMutation({
        mutationFn: async ({ logId, status }: { logId: number; status: string }) => {
            setLogStatusSavingId(logId);
            return api.patch(`/leads/${id}/follow-up-logs/${logId}/status`, { status });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['leads', id] });
        },
        onError: (error: any) => {
            alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
        },
        onSettled: () => setLogStatusSavingId(null),
    });

    const handleScoreChange = (field: string, value: number) => {
        setScores(prev => ({ ...prev, [field]: value }));
    };

    const handleBantChange = (field: string, value: any) => {
        setBant(prev => ({ ...prev, [field]: value }));
        // Auto-reset BANT scores when checkbox is unchecked
        if (field === 'budget_yes_no' && !value) setScores(prev => ({ ...prev, budget_allocated_score: 0 }));
        if (field === 'authority_yes_no' && !value) setScores(prev => ({ ...prev, decision_maker_score: 0 }));
        if (field === 'need_yes_no' && !value) setScores(prev => ({ ...prev, established_need_score: 0 }));
        if (field === 'timeline_yes_no' && !value) setScores(prev => ({ ...prev, urgency_score: 0 }));
    };

    const onSubmit = (data: any) => {
        // Merge scores and BANT into form data
        const fullData = { ...data, ...scores, ...bant };

        // Once a lead is Won or Lost the Cashflow Forecast section is gone from the page
        // and the forecast is deleted server-side, so nothing below should validate or
        // post it.
        const isOrderResolved = quadrant === 'Order Won' || quadrant === 'Order Lost';

        setMilestoneError(null);
        setFormError(null);

        // Product is mandatory
        if (!fullData.product_id) {
            alert('Please select a Product.');
            return;
        }

        // --- NEW VALIDATION LOGIC ---
        // Milestone total validation
        if (milestones.length > 0) {
            const orderVal = parseFloat(fullData.order_value) || 0;
            const milestoneTotal = milestones.reduce((sum, m) => sum + (parseFloat(m.expected_amount) || 0), 0);
            // Every milestone check also fills formError: the message beside the Save
            // button is the only one guaranteed to be on screen, since the section
            // holding milestoneError can be collapsed.
            const block = (msg: string) => { setMilestoneError(msg); setFormError(msg); };
            if (orderVal > 0 && milestoneTotal > orderVal) {
                block('Total milestone expected amount cannot exceed the Order Value.');
                return;
            }
            // Mirrors the server's own rules, so a plan carried over from a forecast —
            // where amount and percentage are optional — is caught here with a message
            // rather than rejected later by an API call whose error nobody sees.
            // Amount is authoritative: derive the total from the (exact) amount total
            // rather than summing each row's display-rounded percentage — otherwise
            // splits like /6 or /7 round each row up and the sum falsely exceeds 100%
            // even though the amounts themselves add up to no more than the Order Value.
            const totalPercentage = orderVal > 0
                ? (milestoneTotal / orderVal) * 100
                : milestones.reduce((sum, m) => sum + (parseFloat(m.percentage) || 0), 0);
            if (totalPercentage > 100.01) {
                block('Total milestone percentage cannot exceed 100%.');
                return;
            }
            for (const m of milestones) {
                if (!m.edc) {
                    block('Please select an EDC for all milestones.');
                    return;
                }
                if ((parseFloat(m.expected_amount) || 0) <= 0) {
                    block('Expected Amount must be greater than 0 for every milestone.');
                    return;
                }
            }
        }

        // Cashflow Forecast validation — Device Count, Expected Amount and Percentage are
        // intentionally not validated: not every product has a device count, and
        // milestones are commonly added/refined incrementally across multiple edits.
        //
        // Skipped entirely once the lead has resolved to Order Won/Lost. Section 9 is not
        // rendered at those quadrants, so a failure here used to stop the save with its
        // message in an unmounted section — the Save button simply did nothing. There is
        // also nothing left to validate: the server deletes the forecast on that
        // transition, and `expected_order` stays true from the earlier prefill.
        setForecastError(null);
        if (!isOrderResolved && (fullData.expected_order === true || fullData.expected_order === 'true')) {
            const expectedOrderValue = parseFloat(fullData.forecast_expected_order_value) || 0;
            if (expectedOrderValue <= 0) {
                // Whole save (lead + forecast + any milestone rows just typed in) is
                // blocked here rather than only the forecast — nothing about this lead
                // has been posted yet, so nothing is silently lost, but that also means
                // a milestone row added before this field is filled in cannot be saved
                // until it is. Named explicitly so that isn't mistaken for a stuck "Add
                // Milestone" button.
                setForecastError('Expected Order Value must be greater than 0 before the forecast (and any milestone rows) can be saved.');
                return;
            }
            if (!fullData.vertical_id) {
                setForecastError('Vertical is required for a forecasted lead.');
                return;
            }
            if (fullData.forecast_expected_order_closure_date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (new Date(fullData.forecast_expected_order_closure_date) < today) {
                    setForecastError('Expected Order Closure Date cannot be in the past.');
                    return;
                }
            }
            for (const m of forecastMilestones) {
                if (!m.expected_collection_date) {
                    setForecastError('Expected Collection Date is mandatory for every forecast milestone.');
                    return;
                }
            }
        }

        // 2. If Product is selected, Mgmt Call Completed is MANDATORY
        // if (productOrService === 'Product' && fullData.mgmt_call_completed !== 'true' && fullData.mgmt_call_completed !== true && productOrService === 'Product' && fullData.mgmt_call_completed !== 'false' && fullData.mgmt_call_completed !== false) {
        //     alert('Validation Error: For Product leads, "Management Call Completed" is mandatory.');
        //     return;
        // }

        // Attach manually managed files if they exist
        if (painPointsFiles && painPointsFiles.length > 0) {
            fullData.pain_points_files = painPointsFiles;
        }

        // Attach Order Won Attachment if it exists
        if (orderWonAttachment && orderWonAttachment.length > 0) {
            fullData.order_won_attachment = orderWonAttachment;
        }

        // Attach Post Demo Feedback File if it exists
        if (postDemoFeedbackFile && postDemoFeedbackFile.length > 0) {
            fullData.post_demo_feedback_file = postDemoFeedbackFile;
        }

        // Attach Dynamic Documents
        const validDocs = dynamicDocuments.filter(d => d.file !== null);
        if (validDocs.length > 0) {
            fullData.dynamicDocuments = validDocs;
        }

        // Add contacts array
        if (contacts.length > 0) {
            fullData.contacts = contacts;
        }

        // Add created_by user ID (only for new leads)
        if (!isEdit && currentUser) {
            fullData.created_by_id = currentUser.id;
        }

        fullData.custom_count_type = selectedCountType || null;

        // Add calculated CP Score
        fullData.cp_score = cpScore;

        console.log('DEBUG: LeadForm onSubmit fullData:', fullData);

        mutation.mutate(fullData);
    };


    const isFrozen = React.useMemo(() => {
        if (!existingLead || !salesStages) return false;
        const orderWonStage = salesStages.find((s: any) => s.name === 'Order Won');
        const orderLostStage = salesStages.find((s: any) => s.name === 'Order Lost');

        return (
            (orderWonStage && existingLead.sales_stage_id === orderWonStage.id) ||
            (orderLostStage && existingLead.sales_stage_id === orderLostStage.id)
        );
    }, [existingLead, salesStages]);

    if (loadingLead && isEdit) return <div className="p-8">Loading lead data...</div>;

    return (
        <div className="px-4 py-6 sm:px-[6.5rem] sm:py-6 w-full bg-slate-50/60 min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/leads')} className="text-gray-500 hover:text-gray-700" type="button">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Lead' : 'New Lead'}</h1>
                        {isFrozen && (
                            <span className="flex items-center text-red-600 text-xs font-bold uppercase tracking-wider mt-1">
                                <span className="mr-1">🔒</span> Permanent Lock: {
                                    salesStages?.find((s: any) => s.name === 'Order Lost')?.id === existingLead?.sales_stage_id
                                        ? 'Order Lost' : 'Order Won'
                                }
                            </span>
                        )}
                    </div>
                </div>
                {isFrozen && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center space-x-2 animate-pulse shadow-sm">
                        <span className="text-lg">🔒</span>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm leading-tight">VIEW ONLY MODE</span>
                            <span className="text-[10px] opacity-80 uppercase font-medium">This record is permanently locked</span>
                        </div>
                    </div>
                )}
                <div></div>
            </div>

            {isEdit && existingLead?.requires_requalification && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg mb-6 flex items-start space-x-3">
                    <span className="text-lg leading-none">⚠️</span>
                    <div>
                        <p className="font-bold text-sm">This lead has been automatically degraded.</p>
                        <p className="text-sm">Lead Score and BANT values have been reset. Please requalify the lead to continue the sales process.</p>
                    </div>
                </div>
            )}

            <form className="space-y-8">
                {/* Section 1: Account Owner Info */}
                <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('accountInfo')}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">Section 1: Account Owner Info</h2>
                        {sections.accountInfo ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                    {sections.accountInfo && (
                        <fieldset disabled={isFrozen} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                                <input
                                    value={currentUser ? `${currentUser.first_name} ${currentUser.last_name || ''}` : 'N/A'}
                                    disabled
                                    className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border bg-gray-50 cursor-not-allowed text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sales SBU</label>
                                <select {...register('sales_sbu_id')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors">
                                    <option value="">Select SBU</option>
                                    {sbus?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Owner</label>
                                <select {...register('lead_owner_id')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors">
                                    <option value="">Select Owner</option>
                                    {leadOwners?.map((u: any) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Enquiry Date</label>
                                <DateOverlay value={watch('enquiry_date')}>
                                    <input
                                        {...register('enquiry_date')}
                                        type="date"
                                        max={new Date().toISOString().split('T')[0]}
                                        onClick={(e) => (e.currentTarget as any).showPicker?.()}
                                        className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                    />
                                </DateOverlay>
                            </div>
                        </fieldset>
                    )}
                </div>

                {/* Section 2: Company Details */}
                <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('companyDetails')}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">Section 2: Company Details</h2>
                        {sections.companyDetails ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                    {sections.companyDetails && (
                        <fieldset disabled={isFrozen} className="space-y-6">
                            {/* Sub heading: Company contact person */}
                            <div className="mt-4">
                                <h3 className="text-md font-semibold mb-4 text-gray-600 bg-gray-50 p-2 rounded">Company contact person</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Salutation</label>
                                        <select {...register('salutation')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors">
                                            <option value="">Select</option>
                                            <option value="Mr">Mr</option>
                                            <option value="Mrs">Mrs</option>
                                            <option value="Ms">Ms</option>
                                            <option value="Dr">Dr</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <input {...register('first_name')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input {...register('last_name')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors" />
                                    </div>
                                    {/* <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            {...register('email')}
                                            type="email"
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="email@example.com"
                                        />
                                        {errors.email && <span className="text-red-500 text-xs">{errors.email.message as string}</span>}
                                    </div> */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title (Designation)</label>
                                        <input {...register('job_title_name')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Enter job title" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
                                        <select {...register('avatar_id')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors">
                                            <option value="">Select Avatar</option>
                                            {avatars?.filter((a: any) => a.is_active).map((a: any) => (
                                                <option key={a.id} value={a.id}>{a.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Persona</label>
                                        <select
                                            value={watch('persona_id') || ''}
                                            onChange={(e) => !isFrozen && setValue('persona_id', e.target.value)}
                                            disabled={!selectedProductId || isFrozen}
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Select Persona</option>
                                            {personas?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            {...register('email')}
                                            type="email"
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="email@example.com"
                                        />
                                        {errors.email && <span className="text-red-500 text-xs">{errors.email.message as string}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                        <input
                                            {...register('mobile_number')}
                                            type="tel"
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="e.g., 9876543210"
                                        />
                                        {errors.mobile_number && <span className="text-red-500 text-xs">{errors.mobile_number.message as string}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                                        <input
                                            {...register('whatsapp_number')}
                                            type="tel"
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="e.g., 9876543210"
                                        />
                                        {errors.whatsapp_number && <span className="text-red-500 text-xs">{errors.whatsapp_number.message as string}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Sub heading: Company details */}
                            <div className="mt-8">
                                <h3 className="text-md font-semibold mb-4 text-gray-600 bg-gray-50 p-2 rounded">Company Info</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                        <input
                                            {...register('company_name')}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                                        <select {...register('industry_id')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors">
                                            <option value="">Select Industry</option>
                                            {industries?.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                                        <select {...register('lead_source_id')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors">
                                            <option value="">Select Source</option>
                                            {sources?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Annual Turnover</label>
                                        <input
                                            {...register('annual_turnover')}
                                            type="number"
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="e.g., 5000000"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                        <input
                                            {...register('website')}
                                            type="url"
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="https://example.com"
                                        />
                                        {errors.website && <span className="text-red-500 text-xs">{errors.website.message as string}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Sub heading: Address */}
                            <div className="mt-8">
                                <h3 className="text-md font-semibold mb-4 text-gray-600 bg-gray-50 p-2 rounded">Address</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                        <select {...register('country_id')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors">
                                            <option value="">Select Country</option>
                                            {countries?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <select {...register('state_id')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors" disabled={!selectedCountryId}>
                                            <option value="">Select State</option>
                                            {states?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        {!selectedCountryId && <p className="text-xs text-gray-500 mt-1">Select a country first</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <select {...register('city_id')} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors" disabled={!selectedStateId}>
                                            <option value="">Select City</option>
                                            {cities?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        {!selectedStateId && <p className="text-xs text-gray-500 mt-1">Select a state first</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pin Code</label>
                                        <input
                                            {...register('pin_code')}
                                            type="text"
                                            maxLength={6}
                                            className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="e.g., 560001"
                                        />
                                        {errors.pin_code && <span className="text-red-500 text-xs">{errors.pin_code.message as string}</span>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                                        <textarea {...register('address')} rows={2} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Street address" />
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    )}
                </div>

                {/* Section 3: Other Contacts */}
                {/* <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200">
                    <div className="flex items-center justify-between mb-4 border-b pb-2">
                        <h2 className="text-lg font-semibold text-gray-800">Other Contacts</h2>
                        {!isFrozen && (
                            <button
                                type="button"
                                onClick={addContact}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
                            >
                                <span>+</span>
                                <span>Add Contact</span>
                            </button>
                        )}
                    </div>
                    {sections.otherContacts && (
                        <fieldset disabled={isFrozen} className="space-y-4">
                            {contacts.map((contact, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                                    {!isFrozen && (
                                        <button
                                            type="button"
                                            onClick={() => removeContact(index)}
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
                                            <input
                                                value={contact.name}
                                                onChange={(e) => updateContact(index, 'name', e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                                placeholder="Name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Designation</label>
                                            <input
                                                value={contact.designation}
                                                onChange={(e) => updateContact(index, 'designation', e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                                placeholder="Designation"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                                            <input
                                                type="email"
                                                value={contact.email}
                                                onChange={(e) => updateContact(index, 'email', e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                                placeholder="Email"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Mobile</label>
                                            <input
                                                value={contact.contact_mobile}
                                                onChange={(e) => updateContact(index, 'contact_mobile', e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                                placeholder="Mobile"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Avatar</label>
                                            <select
                                                value={contact.avatar_id || ''}
                                                onChange={(e) => updateContact(index, 'avatar_id', e.target.value)}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            >
                                                <option value="">Select</option>
                                                {avatars?.filter((a: any) => a.is_active).map((a: any) => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">Customer Persona</label>
                                            <select
                                                value={contact.persona_id || ''}
                                                onChange={(e) => updateContact(index, 'persona_id', e.target.value)}
                                                disabled={!selectedProductId}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50"
                                            >
                                                <option value="">Select Persona</option>
                                                {personas?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {contacts.length === 0 && (
                                <p className="text-gray-500 text-sm italic text-center py-4">No other contacts added.</p>
                            )}
                        </fieldset>
                    )}
                </div> */}
                {/* Section 3: Other Contacts */}
                <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200">

                    {/* Header */}
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('otherContacts')}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">
                            Other Contacts
                        </h2>

                        <div className="flex items-center gap-3">

                            {/* {!isFrozen && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        addContact();
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
                >
                    <span>+</span>
                    <span>Add Contact</span>
                </button>
            )} */}

                            {sections.otherContacts ? (
                                <ChevronUp size={20} className="text-gray-500" />

                            ) : (
                                <ChevronDown size={20} className="text-gray-500" />
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    {sections.otherContacts && (

                        <fieldset disabled={isFrozen} className="space-y-4">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    addContact();
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
                            >
                                <span>+</span>
                                <span>Add Contact</span>
                            </button>

                            {contacts.map((contact, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative"
                                >

                                    {/* Remove Button */}
                                    {!isFrozen && (
                                        <button
                                            type="button"
                                            onClick={() => removeContact(index)}
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                                        {/* Name */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Name
                                            </label>

                                            <input
                                                value={contact.name}
                                                disabled={isFrozen}
                                                onChange={(e) =>
                                                    updateContact(index, 'name', e.target.value)
                                                }
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                placeholder="Name"
                                            />
                                        </div>

                                        {/* Designation */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Designation
                                            </label>

                                            <input
                                                value={contact.designation}
                                                disabled={isFrozen}
                                                onChange={(e) =>
                                                    updateContact(index, 'designation', e.target.value)
                                                }
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                placeholder="Designation"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Email
                                            </label>

                                            <input
                                                type="email"
                                                value={contact.email}
                                                disabled={isFrozen}
                                                onChange={(e) =>
                                                    updateContact(index, 'email', e.target.value)
                                                }
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                placeholder="Email"
                                            />
                                        </div>

                                        {/* Mobile */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Mobile
                                            </label>

                                            <input
                                                value={contact.contact_mobile}
                                                disabled={isFrozen}
                                                onChange={(e) =>
                                                    updateContact(index, 'contact_mobile', e.target.value)
                                                }
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                placeholder="Mobile"
                                            />
                                        </div>

                                        {/* Avatar */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Avatar
                                            </label>

                                            <select
                                                value={contact.avatar_id || ''}
                                                disabled={isFrozen}
                                                onChange={(e) =>
                                                    updateContact(index, 'avatar_id', e.target.value)
                                                }
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select</option>

                                                {avatars
                                                    ?.filter((a: any) => a.is_active)
                                                    .map((a: any) => (
                                                        <option key={a.id} value={a.id}>
                                                            {a.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>

                                        {/* Customer Persona */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                                Customer Persona
                                            </label>

                                            <select
                                                value={contact.persona_id || ''}
                                                disabled={isFrozen || !selectedProductId}
                                                onChange={(e) =>
                                                    updateContact(index, 'persona_id', e.target.value)
                                                }
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2 border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select Persona</option>

                                                {personas?.map((p: any) => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                    </div>
                                </div>
                            ))}

                            {/* Empty State */}
                            {contacts.length === 0 && (
                                <p className="text-gray-500 text-sm italic text-center py-4">
                                    No other contacts added.
                                </p>
                            )}

                        </fieldset>
                    )}
                </div>

                {/* Section 4: Opportunity & Lead Management */}
                <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('opportunity')}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">Section 3: Opportunity & Lead Management</h2>
                        {sections.opportunity ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                    {sections.opportunity && (
                        <fieldset disabled={isFrozen}>
                            <div>
                                {/* Opportunity Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-50/50 p-4 rounded-lg">
                                    {/* <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Product Or Service</label>
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    checked={productOrService === 'Product'}
                                                    onChange={() => {
                                                        if (!isFrozen) {
                                                            setProductOrService('Product');
                                                            setValue('eit_service_id', '');
                                                            setValue('im_service_id', '');
                                                        }
                                                    }}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Product</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    checked={productOrService === 'EitService'}
                                                    onChange={() => {
                                                        if (!isFrozen) {
                                                            setProductOrService('EitService');
                                                            setValue('product_id', '');
                                                            setValue('im_service_id', '');
                                                        }
                                                    }}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>EIT Service</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    checked={productOrService === 'ImService'}
                                                    onChange={() => {
                                                        if (!isFrozen) {
                                                            setProductOrService('ImService');
                                                            setValue('product_id', '');
                                                            setValue('eit_service_id', '');
                                                        }
                                                    }}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>IM Service</span>
                                            </label>
                                        </div>
                                    </div> */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Product <span className="text-red-500">*</span></label>
                                        <select
                                            {...register('product_id', { required: 'Product is required.' })}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select Product</option>
                                            {products?.filter((p: any) => p.is_active).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        {errors.product_id && <span className="text-red-500 text-xs">{errors.product_id.message as string}</span>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name / Order Name</label>
                                        <input
                                            type="text"
                                            maxLength={255}
                                            {...register('project_name')}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter project or order name"
                                        />
                                    </div>
                                    {/* {productOrService === 'EitService' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">EIT Service</label>
                                            <select {...register('eit_service_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
                                                <option value="">Select EIT Service</option>
                                                {eitServices?.filter((s: any) => s.is_active).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                <option value="others">Others</option>
                                            </select>
                                        </div>
                                    )}
                                    {productOrService === 'ImService' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">IM Service</label>
                                            <select {...register('im_service_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
                                                <option value="">Select IM Service</option>
                                                {imServices?.filter((s: any) => s.is_active).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                <option value="others">Others</option>
                                            </select>
                                        </div>
                                    )} */}
                                    {selectedProductOrService && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Persona</label>
                                            <select
                                                value={watch('persona_id') || ''}
                                                onChange={(e) => !isFrozen && setValue('persona_id', e.target.value)}
                                                disabled={isFrozen}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select Persona</option>
                                                {personas?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {/* <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Where will you find them</label>
                                        <select {...register('where_find_them_id')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
                                            <option value="">Select Source</option>
                                            {sources?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div> */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Qualified thru Telecalling</label>
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    {...register('telecalling_qualified')}
                                                    value="true"
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>Yes</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    {...register('telecalling_qualified')}
                                                    value="false"
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span>No</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Lead Management Fields */}
                                <div className="mb-6">
                                    <h3 className="text-md font-medium text-gray-800 mb-3 underline">License Need</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            {!selectedProductId ? (
                                                <p className="text-sm text-gray-500 mt-2">Select a product to configure count type.</p>
                                            ) : !selectedCountType ? (
                                                <p className="text-sm text-amber-600 mt-2">No Count Type configured for the selected Product.</p>
                                            ) : (
                                                <>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        {selectedCountType} <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        {...register('license_count')}
                                                        className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                                        placeholder={`Enter ${selectedCountType.toLowerCase()}`}
                                                        type="number"
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Opportunities Values (INR)</label>
                                            <input
                                                type="number"
                                                {...register('opportunities_values')}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                                placeholder="Enter opportunities values"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Requirement Description</label>
                                            <textarea
                                                {...register('requirement_desc')}
                                                rows={4}
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                                placeholder="Describe the requirements..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pain Points</label>
                                            <textarea {...register('pain_points')} rows={4} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Describe the pain points..." />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Competitor Details</label>
                                            <textarea {...register('competitor_details')} rows={4} className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Describe competitor details..." />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Document Attachment</label>
                                            <input
                                                type="file"
                                                onChange={(e) => setPainPointsFiles(e.target.files)}
                                                multiple
                                                className="block w-full rounded-lg border-gray-300 shadow-sm p-2.5 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Upload requirement documents or pain point details.</p>
                                            {/* Display existing files */}
                                            {existingLead?.pain_points_files && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-semibold text-gray-700">Existing Files:</p>
                                                    <ul className="list-disc pl-5 text-sm text-blue-600">
                                                        {(() => {
                                                            if (!existingLead.pain_points_files) return null;
                                                            let files = [];
                                                            try {
                                                                files = JSON.parse(existingLead.pain_points_files);
                                                            } catch (e) {
                                                                // Fallback: simple string or comma-separated
                                                                files = existingLead.pain_points_files.split(',');
                                                            }

                                                            if (!Array.isArray(files)) files = [files];

                                                            // Make sure we have valid strings
                                                            files = files.filter((f: any) => typeof f === 'string' && f.trim() !== '');

                                                            return files.map((file: string, idx: number) => (
                                                                <li key={idx}>
                                                                    <a href={`${import.meta.env.VITE_UPLOAD_URL}${file.startsWith('/') ? '' : '/'}${file}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                                        {file.split('/').pop() || 'Download'}
                                                                    </a>
                                                                </li>
                                                            ));
                                                        })()}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                                    {/* 2. Collaterals Shared */}
                                    <div>
                                        <h3 className="text-md font-medium text-gray-800 mb-3">2. Collaterals Shared</h3>
                                        <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[50px]">
                                            {collaterals?.map((c: any) => {
                                                const currentSelection = watch('collaterals') || [];
                                                // Ensure we compare strings as IDs might be string/number mix during parsing
                                                const isSelected = currentSelection.includes(c.id.toString());

                                                return (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => {
                                                            if (isFrozen) return;
                                                            const newSelection = isSelected
                                                                ? currentSelection.filter((id: string) => id !== c.id.toString())
                                                                : [...currentSelection, c.id.toString()];
                                                            setValue('collaterals', newSelection, { shouldDirty: true });
                                                        }}
                                                        className={`cursor-pointer px-3 py-1 rounded-full text-sm border transition-colors flex items-center space-x-1
                                                                ${isSelected
                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                                                                ${isFrozen ? 'cursor-not-allowed opacity-60' : ''}`}
                                                    >
                                                        <span>{c.name}</span>
                                                        {isSelected && <span className="text-xs ml-1">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 3. Demo Completed */}
                                    <div>
                                        <h3 className="text-md font-medium text-gray-800 mb-3">3. Demo Completed</h3>
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center space-x-2">
                                                <input type="radio" {...register('demo_completed')} value="true" className="rounded" />
                                                <span>Yes</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input type="radio" {...register('demo_completed')} value="false" className="rounded" />
                                                <span>No</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 4. Pilot Provided */}
                                    <div>
                                        <h3 className="text-md font-medium text-gray-800 mb-3">4. Pilot Provided</h3>
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center space-x-2">
                                                <input type="radio" {...register('pilot_provided')} value="true" className="rounded" />
                                                <span>Yes</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input type="radio" {...register('pilot_provided')} value="false" className="rounded" />
                                                <span>No</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    )}
                </div>

                {/* Section 5: Demo, Pilot & Authority Engagement */}

                {/* 

 <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200 mb-6">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('engagement')}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">Section 5: Demo, Pilot & Authority Engagement</h2>
                        {sections.engagement ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                    {sections.engagement && (
                        <fieldset disabled={isFrozen} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Demo to the Authority/Decision maker done ?</label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('demo_done_authority')} value="true" className="rounded" />
                                            <span>Yes</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('demo_done_authority')} value="false" className="rounded" />
                                            <span>No</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Probing Discussion with Authority?</label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('probing_discussion_authority')} value="true" className="rounded" />
                                            <span>Yes</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('probing_discussion_authority')} value="false" className="rounded" />
                                            <span>No</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Direct Visit with Authority?</label>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-2">
                                        <input type="radio" {...register('direct_visit_authority')} value="true" className="rounded" />
                                        <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input type="radio" {...register('direct_visit_authority')} value="false" className="rounded" />
                                        <span>No</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Post Demo Feedback Sent?</label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('post_demo_feedback_sent')} value="true" className="rounded" />
                                            <span>Yes</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('post_demo_feedback_sent')} value="false" className="rounded" />
                                            <span>No</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Post Demo Feedback Received?</label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('post_demo_feedback_received')} value="true" className="rounded" />
                                            <span>Yes</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('post_demo_feedback_received')} value="false" className="rounded" />
                                            <span>No</span>
                                        </label>
                                    </div>
                                    {watch('post_demo_feedback_received') === 'true' && (
                                        <div className="mt-2">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Upload Feedback File</label>
                                            <input
                                                type="file"
                                                onChange={(e) => setPostDemoFeedbackFile(e.target.files)}
                                                className="w-full text-sm p-1 border rounded bg-white text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            {existingLead?.post_demo_feedback_file && (
                                                <div className="mt-1">
                                                    <a href={`${import.meta.env.VITE_UPLOAD_URL}${existingLead.post_demo_feedback_file}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center space-x-1">
                                                        <span>📎</span>
                                                        <span>View Existing Feedback</span>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pilot Given? <span className="text-xs text-gray-500">(Mandatory for Q3)</span></label>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-2">
                                        <input type="radio" {...register('pilot_given')} value="true" className="rounded" />
                                        <span>Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input type="radio" {...register('pilot_given')} value="false" className="rounded" />
                                        <span>No</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Post Pilot/Post Demo Management call completed for Products Lead? <span className="text-xs text-gray-500">(Mandatory for Product)</span></label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('mgmt_call_completed')} value="true" className="rounded" />
                                            <span>Yes</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('mgmt_call_completed')} value="false" className="rounded" />
                                            <span>No</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Utilized Management for validating urgency/Budget?</label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('utilized_mgmt_urgency')} value="true" className="rounded" />
                                            <span>Yes</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('utilized_mgmt_urgency')} value="false" className="rounded" />
                                            <span>No</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Utilized Tech Presales for validating timeline?</label>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('utilized_presales_timeline')} value="true" className="rounded" />
                                            <span>Yes</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input type="radio" {...register('utilized_presales_timeline')} value="false" className="rounded" />
                                            <span>No</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('authority_champion_influencer_identified')}
                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                    />
                                    <span className="text-sm ">
                                        Clearly identified Authority/Decision maker along with Champion and influencer <span className="text-xs text-blue-600 font-normal">(Mandatory for Q3)</span>
                                    </span>
                                </label>
                            </div>
                        </fieldset>
                    )}
                </div>

*/}
                {/* Section 5: Lead Qualification Score Module */}
                <div id="lead-scorecard-section" className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('scoreModule')}
                    >
                        <h2 className="text-lg font-semibold flex items-center space-x-2">
                            <span>Section 4: Lead Qualification Score Module</span>
                        </h2>
                        {sections.scoreModule ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                    {sections.scoreModule && (
                        <div>
                            <div className="flex items-center justify-end mb-4">
                                <button
                                    type="button"
                                    onClick={() => setShowScoreCard(!showScoreCard)}
                                    className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                                >
                                    <Calculator size={16} />
                                    <span>{showScoreCard ? 'Hide' : 'Open'} Score Card</span>
                                </button>
                            </div>

                            {showScoreCard && (
                                <LeadScoreCard
                                    scores={scores}
                                    onChange={handleScoreChange}
                                    readOnly={isFrozen}
                                    bant={bant}
                                    onBantChange={handleBantChange}
                                    contactOptions={contactOptions}
                                />
                            )}

                            {!showScoreCard && (
                                <div className="text-center py-6 bg-gray-50 rounded-lg">
                                    <div className="text-4xl font-bold text-blue-600 mb-2">
                                        {calculateTotalScore(scores)} / 28
                                    </div>
                                    <p className="text-sm text-gray-600">Current Lead Score</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowScoreCard(true)}
                                        className="mt-2 text-xs text-blue-500 hover:underline"
                                    >
                                        View full breakdown
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>


                {/* Section 7: Lead Quadrant */}
                <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('quadrant')}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">Section 5: Lead Quadrant</h2>
                        {sections.quadrant ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                    {
                        sections.quadrant && (
                            <fieldset disabled={isFrozen}>
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        <div className={`px-4 py-2 rounded-lg border font-bold text-xl ${quadrant === 'Order Won' ? 'bg-green-100 text-green-800 border-green-300' :
                                            quadrant === 'Order Lost' ? 'bg-red-100 text-red-800 border-red-300' :
                                                quadrant === 'Q4' ? 'bg-red-100 text-red-800 border-red-300' :
                                                    quadrant === 'Q3' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                                        quadrant === 'Q2' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                            quadrant === 'Q1' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                                quadrant === 'Nurturing' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                                                    'bg-gray-100 text-gray-800 border-gray-300'
                                            }`}>
                                            {quadrant || 'N/A'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {quadrant === 'Order Won' ? 'Deal Won' :
                                                    quadrant === 'Order Lost' ? 'Deal Lost' :
                                                        quadrant === 'Q4' ? 'Hot - Ready to close' :
                                                            quadrant === 'Q3' ? 'Warm - High potential' :
                                                                quadrant === 'Q2' ? 'Progressing - Nurturing needed' :
                                                                    quadrant === 'Q1' ? 'Interested - Early stage' : 'Unknown'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {isManualQuadrant ? 'Manually set by user' : 'Auto-calculated based on Score & BANT'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-xs text-slate-400 italic">Auto-calculated — read only</span>
                                    </div>
                                </div>
                            </fieldset>
                        )}
                </div>

                {/* Section 8: Demo, Pilot & Authority Engagement */}
                <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200 mb-6">
                    <div
                        className="flex items-center justify-between border-b border-gray-100 pb-3 mb-6"
                    >
                        <div
                            className="flex items-center space-x-2 cursor-pointer flex-1 hover:opacity-75 transition-opacity"
                            onClick={() => toggleSection('engagement')}
                        >
                            <h2 className="text-lg font-semibold text-gray-800">Section 6: Demo, Pilot & Authority Engagement</h2>
                            {sections.engagement ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                        </div>
                        <div className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full font-bold text-sm border border-blue-200 shadow-sm flex items-center space-x-2">
                            <span>CP Score:</span>
                            <span className="text-lg">{cpScore} / 10</span>
                        </div>
                    </div>
                    {sections.engagement && (
                        <fieldset disabled={isFrozen} className="divide-y divide-gray-100">

                            {/* Row: Authority, Champion & Influencer Identified (checkbox) */}
                            {/* <div className="pt-3">
                                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm pr-4">
                                            Clearly identified Authority/Decision maker along with Champion and influencer{' '}
                                            <span className="text-xs text-blue-600 font-normal">(Mandatory for Q3)</span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            {...register('authority_champion_influencer_identified')}
                                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer shrink-0"
                                        />
                                    </label>
                                </div>
                            </div>
*/}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>1. </span>Clearly identified Authority/Decision maker along with Champion and influencer{' '}
                                    <span className="text-xs text-blue-600 font-normal">(Mandatory for Q3)</span></span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            {...register('authority_champion_influencer_identified')}
                                            className=" text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer shrink-0"
                                        />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                </div>
                            </div>

                            {/* Row: Demo to Authority */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>2. </span>Demo to the Authority/Decision maker done?</span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" {...register('demo_done_authority')} className="rounded" />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                </div>
                            </div>

                            {/* Row: Probing Discussion */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>3. </span>Probing Discussion with Authority?</span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" {...register('probing_discussion_authority')} className="rounded" />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                </div>
                            </div>

                            {/* Row: Direct Visit */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>4. </span>Direct Visit with Authority?</span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" {...register('direct_visit_authority')} className="rounded" />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                </div>
                            </div>

                            {/* Row: Post Demo Feedback Sent */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>5. </span>Post Demo Feedback Sent?</span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" {...register('post_demo_feedback_sent')} className="rounded" />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                    {/* <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="radio" {...register('post_demo_feedback_sent')} value="false" className="rounded" />
                                        <span className="text-sm">No</span>
                                    </label> */}
                                </div>
                            </div>

                            {/* Row: Post Demo Feedback Received */}
                            <div className="py-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>6. </span>Post Demo Feedback Received?</span>
                                    <div className="flex items-center space-x-4 shrink-0">
                                        <label className="flex items-center space-x-1.5 cursor-pointer">
                                            <input type="checkbox" {...register('post_demo_feedback_received')} className="rounded" />
                                            <span className="text-sm">Yes</span>
                                        </label>
                                        {/* <label className="flex items-center space-x-1.5 cursor-pointer">
                                            <input type="radio" {...register('post_demo_feedback_received')} value="false" className="rounded" />
                                            <span className="text-sm">No</span>
                                        </label> */}
                                    </div>
                                </div>
                                {!!watch('post_demo_feedback_received') && (
                                    <div className="mt-2 ml-0">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Upload Feedback File</label>
                                        <input
                                            type="file"
                                            onChange={(e) => setPostDemoFeedbackFile(e.target.files)}
                                            className="w-full text-sm p-1 border rounded bg-white text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        {existingLead?.post_demo_feedback_file && (
                                            <div className="mt-1">
                                                <a href={`${import.meta.env.VITE_UPLOAD_URL}${existingLead.post_demo_feedback_file}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center space-x-1">
                                                    <span>📎</span>
                                                    <span>View Existing Feedback</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Row: Pilot Given */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>7. </span>
                                    Pilot Given? <span className="text-xs text-gray-500">(Mandatory for Q3)</span>
                                </span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" {...register('pilot_given')} className="rounded" />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                    {/* <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="radio" {...register('pilot_given')} value="false" className="rounded" />
                                        <span className="text-sm">No</span>
                                    </label> */}
                                </div>
                            </div>

                            {/* Row: Mgmt Call Completed */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4">
                                    <span className='text-md font-semibold'>8. </span> Post Pilot/Post Demo Management call completed for Products Lead? <span className="text-xs text-gray-500">(Mandatory for Product)</span>
                                </span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" {...register('mgmt_call_completed')} className="rounded" />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                    {/* <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="radio" {...register('mgmt_call_completed')} value="false" className="rounded" />
                                        <span className="text-sm">No</span>
                                    </label> */}
                                </div>
                            </div>

                            {/* Row: Utilized Management */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>9. </span>Utilized Management for validating urgency/Budget?</span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" {...register('utilized_mgmt_urgency')} className="rounded" />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                    {/* <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="radio" {...register('utilized_mgmt_urgency')} value="false" className="rounded" />
                                        <span className="text-sm">No</span>
                                    </label> */}
                                </div>
                            </div>

                            {/* Row: Utilized Presales */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm font-medium text-gray-700 pr-4"><span className='text-md font-semibold'>10. </span>Utilized Tech Presales for validating timeline?</span>
                                <div className="flex items-center space-x-4 shrink-0">
                                    <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="checkbox" {...register('utilized_presales_timeline')} className="rounded" />
                                        <span className="text-sm">Yes</span>
                                    </label>
                                    {/* <label className="flex items-center space-x-1.5 cursor-pointer">
                                        <input type="radio" {...register('utilized_presales_timeline')} value="false" className="rounded" />
                                        <span className="text-sm">No</span>
                                    </label> */}
                                </div>
                            </div>

                            {/* Row: Authority, Champion & Influencer Identified (checkbox) */}
                            {/* <div className="pt-3">
                                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm pr-4">
                                            Clearly identified Authority/Decision maker along with Champion and influencer{' '}
                                            <span className="text-xs text-blue-600 font-normal">(Mandatory for Q3)</span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            {...register('authority_champion_influencer_identified')}
                                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer shrink-0"
                                        />
                                    </label>
                                </div>
                            </div> */}

                        </fieldset>
                    )}
                </div>



                {/* Section 9: Documents (Proposal / Estimation) */}
                <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200 mb-6">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('attachDocuments')}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">Section 7: Documents (Proposal / Estimation)</h2>
                        {sections.attachDocuments ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                    {sections.attachDocuments && (
                        <div>
                            {/* Already-uploaded documents — fetched via GET /leads/:id (documents: true)
                                but never rendered here before; the rows below are only for new uploads. */}
                            {isEdit && (existingLead?.documents?.length ?? 0) > 0 && (
                                <div className="mb-6 space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Uploaded Documents ({existingLead.documents.length})
                                    </label>
                                    {existingLead.documents.map((doc: any) => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
                                            <div className="flex items-center gap-3">
                                                <FileText size={16} className="text-blue-600 shrink-0" />
                                                <div>
                                                    <a
                                                        href={`${import.meta.env.VITE_UPLOAD_URL}${doc.url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        {doc.name}<ExternalLink size={11} />
                                                    </a>
                                                    {doc.description && <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>}
                                                </div>
                                            </div>
                                            {doc.uploaded_at && (
                                                <span className="text-xs text-gray-400 shrink-0">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mb-6">
                                <div className="space-y-4">
                                    {dynamicDocuments.map((doc, index) => (
                                        <div key={index} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 p-4 border rounded bg-gray-50 items-start">
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                                <input
                                                    type="text"
                                                    value={doc.description}
                                                    onChange={(e) => updateDocumentRow(index, 'description', e.target.value)}
                                                    placeholder="e.g. Proposal, Technical Estimation"
                                                    disabled={isFrozen}
                                                    className="w-full p-2 border rounded text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div className="flex-1 w-full">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select File</label>
                                                <input
                                                    type="file"
                                                    onChange={(e) => updateDocumentRow(index, 'file', e.target.files?.[0] || null)}
                                                    disabled={isFrozen}
                                                    className="w-full text-sm p-1 border rounded bg-white text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                                />
                                            </div>
                                            {dynamicDocuments.length > 1 && !isFrozen && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeDocumentRow(index)}
                                                    className="mt-6 p-2 text-red-500 hover:text-red-700 bg-white border border-red-100 rounded-md shadow-sm"
                                                    title="Remove Row"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={addDocumentRow}
                                        disabled={isFrozen}
                                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 shadow-sm transition-colors"
                                    >
                                        <span className="text-lg">+</span>
                                        <span>Add Another Document</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 10: Commercials & Sales Engagement & Closing */}
                <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200 mb-24">
                    <div
                        className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                        onClick={() => toggleSection('commercials')}
                    >
                        <h2 className="text-lg font-semibold text-gray-800">Section 8: Commercials & Sales Engagement & Closing</h2>
                        {sections.commercials ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                    </div>
                    {sections.commercials && (
                        <div className="space-y-8">
                            {/* 1. Price Negotiation Log */}
                            <fieldset disabled={isFrozen} className="bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                                <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                                    <Calculator size={18} className="text-blue-600" />
                                    <span>Price Negotiation Log</span>
                                </h3>
                                {existingLead?.pricing_negotiations?.length > 0 ? (
                                    <div className="overflow-x-auto mb-4">
                                        <table className="min-w-full divide-y divide-gray-200 border bg-white shadow-sm rounded-lg overflow-hidden">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Logged By</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {existingLead.pricing_negotiations.map((log: any) => (
                                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 border-l-4 border-blue-500">{new Date(log.date).toLocaleDateString()}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-600">{log.details}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {log.user ? `${log.user.first_name} ${log.user.last_name || ''}` : log.created_by}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 mb-4 italic px-2">No historical negotiation entries found.</p>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Add New Negotiation Detail</label>
                                    <textarea
                                        {...register('new_negotiation_log')}
                                        rows={3}
                                        className="block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        placeholder="Enter details of today's negotiation..."
                                    />
                                </div>
                            </fieldset>

                            <hr className="border-gray-100" />

                            {/* 2. Sales Engagement & Activity Log */}
                            <div className="space-y-6">
                                <h3 className="text-md font-semibold text-gray-800 flex items-center space-x-2">
                                    <History size={18} className="text-blue-600" />
                                    <span>Sales Engagement & Activity Log</span>
                                </h3>

                                {/* Historical Table (Moved from Section 9) */}
                                {existingLead?.follow_up_logs?.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 border bg-white shadow-sm rounded-lg overflow-hidden">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date & Time</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Activity Type</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Sales Stage</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Notes / Remarks</th>
                                                    {/* <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Next Activity Type</th> */}
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Created By</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {existingLead.follow_up_logs.map((log: any) => (
                                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 border-l-4 border-green-500">
                                                            {formatLogDateTime(log.date)}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase border border-blue-100">
                                                                {log.activity?.name || 'Log Entry'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                                            {log.sales_stage?.name && (
                                                                <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold uppercase border border-orange-100">
                                                                    {log.sales_stage.name}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-600 whitespace-pre-wrap break-words min-w-[200px]">
                                                            {log.notes || <span className="text-gray-300 italic">No notes</span>}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                                            <select
                                                                value={log.status || 'Pending'}
                                                                disabled={isFrozen || followUpLogStatusMutation.isPending && logStatusSavingId === log.id}
                                                                onChange={(e) => followUpLogStatusMutation.mutate({ logId: log.id, status: e.target.value })}
                                                                className={`text-[11px] font-semibold rounded border p-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                                                                    log.status === 'Completed'
                                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                                        : log.status === 'In Progress'
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                }`}
                                                            >
                                                                <option value="Pending">Pending</option>
                                                                <option value="In Progress">In Progress</option>
                                                                <option value="Completed">Completed</option>
                                                            </select>
                                                        </td>
                                                        {/* <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                                            {log.next_activity?.name ? (
                                                                <span className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded text-[10px] font-medium border border-gray-200">
                                                                    {log.next_activity.name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-300">-</span>
                                                            )}
                                                        </td> */}
                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                            {log.creator ? `${log.creator.first_name} ${log.creator.last_name || ''}` : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* New Entry Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/30 p-4 rounded-lg border border-blue-50">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700">Sales Stage</label>
                                        <select
                                            {...register('sales_stage_id')}
                                            disabled={isFrozen}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border disabled:bg-gray-100 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">Select Stage</option>
                                            {salesStages?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>

                                    {/* Dynamic BANT Qualification */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">BANT Pillar Questions</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(bantCategories || []).map((cat: any) => {
                                                const hasAnswers = bantAnsweredCategoryIds.has(cat.id);
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => openBantModal(cat)}
                                                        title={`Open ${cat.name} questions`}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all cursor-pointer
                                                            ${hasAnswers ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100' : 'bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                                                    >
                                                        <span className="font-bold">{cat.code}</span>
                                                        <span className="text-xs font-normal opacity-75">{cat.name}</span>
                                                        <span className={hasAnswers ? 'text-green-600 font-bold' : 'text-gray-400'}>
                                                            {hasAnswers ? '✓' : '✗'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700">Next Activity</label>
                                        <select {...register('next_activity_id')} disabled={isFrozen} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500">
                                            <option value="">Select Activity</option>
                                            {activities?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700">Sales Engagement Date & Time</label>
                                        <div className="mt-1 grid grid-cols-2 gap-2">
                                            <DateOverlay value={engagementDate} textClassName="pl-2 text-sm text-slate-900">
                                            <input
                                                type="date"
                                                value={engagementDate}
                                                onChange={e => setEngagementDate(e.target.value)}
                                                onClick={(e) => (e.currentTarget as any).showPicker?.()}
                                                disabled={isFrozen}
                                                className="block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            </DateOverlay>
                                            <select
                                                value={engagementTime}
                                                onChange={e => setEngagementTime(e.target.value)}
                                                disabled={isFrozen}
                                                className="block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Select Time</option>
                                                {TIME_SLOTS.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* <div>
                                        <label className="block text-sm font-semibold text-gray-700">Reminder Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            {...register('next_activity_datetime')}
                                            disabled={isFrozen}
                                            min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                            onClick={(e) => e.currentTarget.showPicker()}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1 italic">Reminder will be sent via email.</p>
                                    </div> */}

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700">Sales Activity Notes / Remarks</label>
                                        <textarea
                                            {...register('follow_up_notes')}
                                            disabled={isFrozen}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:ring-blue-500 focus:border-blue-500 resize-y"
                                            placeholder="Add notes about today's engagement..."
                                            rows={5}
                                        />
                                    </div>

                                    {/* Order Won Specific Fields */}
                                    {watch('sales_stage_id') && salesStages?.find((s: any) => s.id.toString() === watch('sales_stage_id'))?.name === 'Order Won' && (
                                        <div className="md:col-span-2 mt-4 p-4 border border-green-200 rounded-lg bg-green-50/50 space-y-4">
                                            {/* This lead was forecast before it was won, so the order value,
                                                device count and milestone plan below start from that forecast
                                                rather than from an empty form. Everything stays editable, and
                                                the button re-pulls the forecast if the edits went astray.
                                                Worth knowing: saving as Order Won removes the forecast, so
                                                what is on this screen is what survives. */}
                                            {existingForecast && !isFrozen && (
                                                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900">
                                                    <p className="text-xs font-medium">
                                                        {forecastPrefilled ? 'Filled from the Cashflow Forecast' : 'A Cashflow Forecast exists for this lead'}
                                                        <span className="text-emerald-700 font-normal">
                                                            {' — '}₹{Number(existingForecast.expected_order_value || 0).toLocaleString('en-IN')}
                                                            {existingForecast.device_count != null && ` · ${existingForecast.device_count} device/license`}
                                                            {` · ${(existingForecast.milestones || []).length} milestone${(existingForecast.milestones || []).length === 1 ? '' : 's'}`}
                                                            . Edit anything below before saving.
                                                        </span>
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyForecastToOrderWon(true)}
                                                        title="Replace the order value, device count and milestones with the forecast"
                                                        className="shrink-0 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Fill from Forecast
                                                    </button>
                                                </div>
                                            )}
                                            <div className="max-w-xs">
                                                <label className="block text-sm font-bold text-green-800 mb-1 flex items-center space-x-2">
                                                    <span>📅</span>
                                                    <span>Order Won Date *</span>
                                                </label>
                                                <DateOverlay value={watch('order_won_date')} textClassName="pl-2 text-sm font-bold text-slate-900">
                                                    <input
                                                        type="date"
                                                        {...register('order_won_date')}
                                                        max={new Date().toISOString().split('T')[0]}
                                                        onClick={(e) => (e.currentTarget as any).showPicker?.()}
                                                        disabled={isFrozen}
                                                        className="mt-1 block w-full rounded-md border-green-300 shadow-sm p-2 border focus:ring-green-500 focus:border-green-500"
                                                    />
                                                </DateOverlay>
                                                <p className="text-[10px] text-gray-500 mt-1 italic">Defaults to today; change it if the order was actually won on a different date.</p>
                                            </div>
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-bold text-green-800 mb-1 flex items-center space-x-2">
                                                        <span>💰</span>
                                                        <span>Order Value (INR) *</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        {...register('order_value', { valueAsNumber: true })}
                                                        placeholder="Enter total order value"
                                                        className="mt-1 block w-full rounded-md border-green-300 shadow-sm p-2 border focus:ring-green-500 focus:border-green-500 font-bold text-lg"
                                                        disabled={isFrozen}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm font-bold text-green-800 mb-1 flex items-center space-x-2">
                                                        <span>📱</span>
                                                        <span>Sales Device/License *</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        {...register('sales_device', { valueAsNumber: true })}
                                                        placeholder="Enter Sales Device/License count"
                                                        className="mt-1 block w-full rounded-md border-green-300 shadow-sm p-2 border focus:ring-green-500 focus:border-green-500 font-bold text-lg"
                                                        disabled={isFrozen}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm font-bold text-green-800 mb-1 flex items-center space-x-2">
                                                        <span>📄</span>
                                                        <span>Customer Order Attachment *</span>
                                                    </label>
                                                    <input
                                                        type="file"
                                                        onChange={(e) => setOrderWonAttachment(e.target.files)}
                                                        className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"
                                                        disabled={isFrozen}
                                                    />
                                                    {existingLead?.order_won_attachment && (
                                                        <div className="mt-2 text-[10px]">
                                                            <span className="text-gray-500">Current File: </span>
                                                            <a href={`${import.meta.env.VITE_UPLOAD_URL}${existingLead.order_won_attachment}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                                                {existingLead.order_won_attachment.split('/').pop()}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm font-bold text-green-800 mb-1 flex items-center space-x-2">
                                                        <span>🏭</span>
                                                        <span>Vertical</span>
                                                    </label>
                                                    <select
                                                        {...register('vertical_id')}
                                                        disabled={isFrozen}
                                                        className="mt-1 block w-full rounded-md border-green-300 shadow-sm p-2 border focus:ring-green-500 focus:border-green-500"
                                                    >
                                                        <option value="">Select Vertical</option>
                                                        {(verticals as any[] || []).map((v: any) => (
                                                            <option key={v.id} value={v.id}>{v.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Milestones Section */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-bold text-green-800">Payment Milestones</h4>
                                                    {!isFrozen && (
                                                        <button
                                                            type="button"
                                                            onClick={addMilestone}
                                                            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 border border-green-300 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            + Add Milestone
                                                        </button>
                                                    )}
                                                </div>
                                                {milestones.length > 0 && (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full border-collapse text-sm">
                                                            <thead>
                                                                <tr className="bg-green-100 text-green-800 text-xs font-semibold">
                                                                    <th className="px-3 py-2 text-left border border-green-200">Milestone Type</th>
                                                                    <th className="px-3 py-2 text-left border border-green-200">Percentage (%)</th>
                                                                    <th className="px-3 py-2 text-left border border-green-200">Expected Amount (INR)</th>
                                                                    <th className="px-3 py-2 text-left border border-green-200">EDC <span className="text-red-500">*</span></th>
                                                                    {!isFrozen && <th className="px-3 py-2 border border-green-200"></th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {milestones.map((m, idx) => (
                                                                    <tr key={idx} className="bg-white">
                                                                        <td className="px-2 py-1.5 border border-green-100">
                                                                            <select
                                                                                value={m.payment_type_id}
                                                                                onChange={e => updateMilestone(idx, 'payment_type_id', e.target.value)}
                                                                                disabled={isFrozen}
                                                                                className="w-full rounded border border-gray-200 p-1.5 text-xs focus:ring-green-500 focus:border-green-500"
                                                                            >
                                                                                <option value="">Select Type</option>
                                                                                {(paymentTypes as any[] || []).map((pt: any) => (
                                                                                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </td>
                                                                        <td className="px-2 py-1.5 border border-green-100">
                                                                            <input
                                                                                type="number"
                                                                                min={0}
                                                                                max={100}
                                                                                value={m.percentage}
                                                                                onChange={e => updateMilestonePercentage(idx, e.target.value)}
                                                                                disabled={isFrozen}
                                                                                placeholder="e.g. 30"
                                                                                className="w-full rounded border border-gray-200 p-1.5 text-xs focus:ring-green-500 focus:border-green-500"
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1.5 border border-green-100">
                                                                            <input
                                                                                type="number"
                                                                                min={0}
                                                                                value={m.expected_amount}
                                                                                onChange={e => updateMilestoneAmount(idx, e.target.value)}
                                                                                disabled={isFrozen}
                                                                                placeholder="Amount in INR"
                                                                                className="w-full rounded border border-gray-200 p-1.5 text-xs focus:ring-green-500 focus:border-green-500"
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1.5 border border-green-100">
                                                                            <DateOverlay value={m.edc} textClassName="pl-1.5 text-xs text-slate-900">
                                                                            <input
                                                                                type="date"
                                                                                value={m.edc}
                                                                                onChange={e => updateMilestone(idx, 'edc', e.target.value)}
                                                                                onClick={(e) => (e.target as any).showPicker?.()}
                                                                                disabled={isFrozen}
                                                                                required
                                                                                className={`w-full rounded border p-1.5 text-xs focus:ring-green-500 focus:border-green-500 ${!m.edc ? 'border-red-300' : 'border-gray-200'}`}
                                                                            />
                                                                            </DateOverlay>
                                                                        </td>
                                                                        {!isFrozen && (
                                                                            <td className="px-2 py-1.5 border border-green-100 text-center">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeMilestone(idx)}
                                                                                    className="text-red-500 hover:text-red-700 p-1"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                                {milestones.length > 0 && (() => {
                                                    const orderVal = parseFloat(watch('order_value') as any) || 0;
                                                    const total = milestones.reduce((s, m) => s + (parseFloat(m.expected_amount) || 0), 0);
                                                    const exceeded = orderVal > 0 && total > orderVal;
                                                    return (
                                                        <div className={`mt-2 flex items-center justify-end gap-2 text-xs font-semibold px-2 ${exceeded ? 'text-red-600' : 'text-green-700'}`}>
                                                            <span>Milestone Total: ₹{total.toLocaleString('en-IN')}</span>
                                                            {orderVal > 0 && <span>/ Order Value: ₹{orderVal.toLocaleString('en-IN')}</span>}
                                                        </div>
                                                    );
                                                })()}
                                                {milestones.length === 0 && !isFrozen && (
                                                    <p className="text-xs text-gray-400 italic">No milestones added yet. Click "Add Milestone" to start.</p>
                                                )}
                                                {milestoneError && (
                                                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
                                                        {milestoneError}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 9: Cashflow Forecast — only while the lead hasn't resolved to Order Won/Lost */}
                {quadrant !== 'Order Won' && quadrant !== 'Order Lost' && (
                    <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200 mb-6 border border-amber-100">
                            <div
                                className="flex items-center justify-between cursor-pointer border-b border-gray-100 pb-3 mb-6 hover:opacity-75 transition-opacity"
                                onClick={() => toggleSection('expectedOrder')}
                            >
                                <h2 className="text-lg font-semibold text-gray-800">Section 9: Order & Cashflow Forecast</h2>
                                {sections.expectedOrder ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                            </div>
                            {sections.expectedOrder && (
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            {...register('expected_order')}
                                            disabled={isFrozen}
                                            className="h-5 w-5 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
                                            id="expected_order_checkbox"
                                        />
                                        <label htmlFor="expected_order_checkbox" className="font-semibold text-gray-900 cursor-pointer">
                                            Expected Order — forecast this lead for management visibility
                                        </label>
                                    </div>

                                    {(expectedOrder === true || expectedOrder === 'true') && (
                                        <div className="mt-2 p-4 border border-amber-200 rounded-lg bg-amber-50/50 space-y-4">
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <div className="flex-1">
                                                    <label className="block text-sm font-bold text-amber-800 mb-1">Expected Order Value (INR) *</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        {...register('forecast_expected_order_value', { valueAsNumber: true })}
                                                        placeholder="Enter expected order value"
                                                        className="mt-1 block w-full rounded-md border-amber-300 shadow-sm p-2 border focus:ring-amber-500 focus:border-amber-500 font-bold text-lg"
                                                        disabled={isFrozen}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm font-bold text-amber-800 mb-1">Expected Order Closure Date</label>
                                                    <DateOverlay value={watch('forecast_expected_order_closure_date')} textClassName="pl-2 text-lg font-bold text-slate-900">
                                                    <input
                                                        type="date"
                                                        {...register('forecast_expected_order_closure_date')}
                                                        min={new Date().toISOString().slice(0, 10)}
                                                        onClick={(e) => (e.target as any).showPicker?.()}
                                                        className="mt-1 block w-full rounded-md border-amber-300 shadow-sm p-2 border focus:ring-amber-500 focus:border-amber-500 font-bold text-lg"
                                                        disabled={isFrozen}
                                                    />
                                                    </DateOverlay>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm font-bold text-amber-800 mb-1">Device Count</label>
                                                    <input
                                                        type="number"
                                                        {...register('forecast_device_count', { valueAsNumber: true })}
                                                        placeholder="Optional — not applicable to every product"
                                                        className="mt-1 block w-full rounded-md border-amber-300 shadow-sm p-2 border focus:ring-amber-500 focus:border-amber-500 font-bold text-lg"
                                                        disabled={isFrozen}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-sm font-bold text-amber-800 mb-1">Vertical *</label>
                                                    <select
                                                        {...register('vertical_id')}
                                                        disabled={isFrozen}
                                                        className="mt-1 block w-full rounded-md border-amber-300 shadow-sm p-2 border focus:ring-amber-500 focus:border-amber-500"
                                                    >
                                                        <option value="">Select Vertical</option>
                                                        {(verticals as any[] || []).map((v: any) => (
                                                            <option key={v.id} value={v.id}>{v.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700">Forecast Remarks</label>
                                                <textarea
                                                    {...register('forecast_remarks')}
                                                    disabled={isFrozen}
                                                    rows={3}
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:ring-amber-500 focus:border-amber-500 resize-y"
                                                    placeholder="Optional forecast notes..."
                                                />
                                            </div>

                                            {/* Forecast Milestones */}
                                            <div className="mt-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-bold text-amber-800">Forecast Milestones</h4>
                                                    {!isFrozen && (
                                                        <button
                                                            type="button"
                                                            onClick={addForecastMilestone}
                                                            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            + Add Milestone
                                                        </button>
                                                    )}
                                                </div>
                                                {forecastMilestones.length > 0 && (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full border-collapse text-sm">
                                                            <thead>
                                                                <tr className="bg-amber-100 text-amber-800 text-xs font-semibold">
                                                                    <th className="px-3 py-2 text-left border border-amber-200">Milestone Type</th>
                                                                    <th className="px-3 py-2 text-left border border-amber-200">Percentage (%)</th>
                                                                    <th className="px-3 py-2 text-left border border-amber-200">Expected Amount (INR)</th>
                                                                    <th className="px-3 py-2 text-left border border-amber-200">Expected Collection Date</th>
                                                                    <th className="px-3 py-2 text-left border border-amber-200">Remarks</th>
                                                                    {!isFrozen && <th className="px-3 py-2 border border-amber-200"></th>}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {forecastMilestones.map((m, idx) => (
                                                                    <tr key={idx} className="bg-white">
                                                                        <td className="px-2 py-1.5 border border-amber-100">
                                                                            <select
                                                                                value={m.milestone_master_id}
                                                                                onChange={e => updateForecastMilestone(idx, 'milestone_master_id', e.target.value)}
                                                                                disabled={isFrozen}
                                                                                className="w-full rounded border border-gray-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500"
                                                                            >
                                                                                <option value="">Select Type</option>
                                                                                {(paymentTypes as any[] || []).map((pt: any) => (
                                                                                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </td>
                                                                        <td className="px-2 py-1.5 border border-amber-100">
                                                                            <input
                                                                                type="number"
                                                                                value={m.percentage}
                                                                                onChange={e => updateForecastMilestonePercentage(idx, e.target.value)}
                                                                                disabled={isFrozen}
                                                                                placeholder="e.g. 30"
                                                                                className="w-full rounded border border-gray-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500"
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1.5 border border-amber-100">
                                                                            <input
                                                                                type="number"
                                                                                value={m.expected_amount}
                                                                                onChange={e => updateForecastMilestone(idx, 'expected_amount', e.target.value)}
                                                                                disabled={isFrozen}
                                                                                placeholder="Amount in INR"
                                                                                className="w-full rounded border border-gray-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500"
                                                                            />
                                                                        </td>
                                                                        <td className="px-2 py-1.5 border border-amber-100">
                                                                            <DateOverlay value={m.expected_collection_date} textClassName="pl-1.5 text-xs text-slate-900">
                                                                            <input
                                                                                type="date"
                                                                                value={m.expected_collection_date}
                                                                                onChange={e => updateForecastMilestone(idx, 'expected_collection_date', e.target.value)}
                                                                                onClick={(e) => (e.target as any).showPicker?.()}
                                                                                disabled={isFrozen}
                                                                                className="w-full rounded border border-gray-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500"
                                                                            />
                                                                            </DateOverlay>
                                                                        </td>
                                                                        <td className="px-2 py-1.5 border border-amber-100">
                                                                            <input
                                                                                type="text"
                                                                                value={m.remarks}
                                                                                onChange={e => updateForecastMilestone(idx, 'remarks', e.target.value)}
                                                                                disabled={isFrozen}
                                                                                placeholder="Optional remarks"
                                                                                className="w-full rounded border border-gray-200 p-1.5 text-xs focus:ring-amber-500 focus:border-amber-500"
                                                                            />
                                                                        </td>
                                                                        {!isFrozen && (
                                                                            <td className="px-2 py-1.5 border border-amber-100 text-center">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => removeForecastMilestone(idx)}
                                                                                    className="text-red-500 hover:text-red-700 p-1"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                                {forecastMilestones.length > 0 && (() => {
                                                    const expectedOrderValue = parseFloat(watch('forecast_expected_order_value') as any) || 0;
                                                    const total = forecastMilestones.reduce((s, m) => s + (parseFloat(m.expected_amount) || 0), 0);
                                                    const totalPct = forecastMilestones.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0);
                                                    const exceeded = expectedOrderValue > 0 && total > expectedOrderValue;
                                                    return (
                                                        <div className={`mt-2 flex items-center justify-end gap-3 text-xs font-semibold px-2 ${exceeded ? 'text-red-600' : 'text-amber-700'}`}>
                                                            <span>Milestone Total: ₹{total.toLocaleString('en-IN')}</span>
                                                            {expectedOrderValue > 0 && <span>/ Expected Order Value: ₹{expectedOrderValue.toLocaleString('en-IN')}</span>}
                                                            <span>Total %: {totalPct.toFixed(2)}%</span>
                                                        </div>
                                                    );
                                                })()}
                                                {forecastMilestones.length === 0 && !isFrozen && (
                                                    <p className="text-xs text-gray-400 italic">No milestones added yet. Click "Add Milestone" to start.</p>
                                                )}
                                                {forecastError && (
                                                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 font-medium">
                                                        {forecastError}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="button-save flex justify-end items-center space-x-4">
<div className="cancel">

                        <button
                            type="button"
                            onClick={() => navigate('/leads')}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                            >
                            Cancel
                        </button>
                            </div>
                            <div className="save">

                        {!isFrozen && (
                            <button
                                type="button"
                                onClick={handleSubmit(onSubmit, (errors) => {
                                    console.error('Validation errors:', errors);
                                    const missingFields = Object.keys(errors).join(', ');
                                    setFormError(`Required fields missing: ${missingFields}`);
                                })}
                                className="bg-primary text-white px-8 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition-colors shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={mutation.isPending}
                            >
                                <Save size={20} />
                                <span>{mutation.isPending ? 'Saving...' : 'Save Lead'}</span>
                            </button>
                        )}
                            </div>

                        {formError && (
                            <div className="absolute bottom-20 right-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded shadow-sm text-sm animate-fade-in flex items-center space-x-2">
                                <span className="font-semibold">Error:</span>
                                <span>{formError}</span>
                            </div>
                        )}
                        
                    </div>

                {/* Section 11: Actions */}
                {/* <div className="bg-white p-6 sm:p-7 rounded-xl shadow-md border border-gray-200 mb-32">
                    <h2 className="text-lg font-semibold mb-4 border-b pb-2">Section 12: Actions</h2>
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-100 hover:border-blue-200 transition-colors">
                        <fieldset disabled={isFrozen} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        {...register('is_farming')}
                                        className="peer h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                        id="farming_checkbox"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label htmlFor="farming_checkbox" className="font-semibold text-gray-900 cursor-pointer">Move to Farming</label>
                                    <p className="text-sm text-gray-500 mt-1">Check this to move the lead to the Farming module once all details are complete.</p>
                                </div>
                            </div>
                        </fieldset>
                    </div>
                </div> */}

                {/* Form Actions (Sticky Footer) */}
                {/* <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex justify-end items-center space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate('/leads')}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    {!isFrozen && (
                        <button
                            type="button"
                            onClick={handleSubmit(onSubmit, (errors) => {
                                console.error('Validation errors:', errors);
                                const missingFields = Object.keys(errors).join(', ');
                                setFormError(`Required fields missing: ${missingFields}`);
                            })}
                            className="bg-primary text-white px-8 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-600 transition-colors shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={mutation.isPending}
                        >
                            <Save size={20} />
                            <span>{mutation.isPending ? 'Saving...' : 'Save Lead'}</span>
                        </button>
                    )}
                    {formError && (
                        <div className="absolute bottom-20 right-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded shadow-sm text-sm animate-fade-in flex items-center space-x-2">
                            <span className="font-semibold">Error:</span>
                            <span>{formError}</span>
                        </div>
                    )}
                </div> */}
            </form >

            {/* BANT Qualification Modal */}
            {bantModalCategory && (
                <div className="fixed inset-0 z-[200] overflow-y-auto flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50 rounded-t-xl">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">{bantModalCategory.name} Qualification Questions</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Answers are optional — save partial answers anytime</p>
                            </div>
                            <button type="button" onClick={closeBantModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
                            {(bantModalQuestions as any[] | undefined)?.map((q: any, idx: number) => (
                                <div key={q.id}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Q{idx + 1}: {q.question}
                                    </label>
                                    <textarea
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        rows={3}
                                        placeholder="Enter your answer..."
                                        value={bantLocalAnswers[q.id] !== undefined ? bantLocalAnswers[q.id] : (bantSavedAnswerMap[q.id] ?? '')}
                                        onChange={e => setBantLocalAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    />
                                </div>
                            ))}
                            {!(bantModalQuestions as any[] | undefined)?.length && (
                                <p className="text-gray-400 text-sm italic text-center py-4">No questions configured for this category.</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-xl">
                            <button
                                type="button"
                                onClick={closeBantModal}
                                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveBantAnswers}
                                disabled={bantIsSaving}
                                className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {bantIsSaving ? 'Saving...' : 'Save & Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Persona Mapping Modal */}
            {isPersonaModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Contact Persona Mapping</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Assign customer personas to your contacts for the selected Product:
                                    <span className="font-semibold text-blue-600 ml-1">
                                        {selectedProductOrService?.name || 'Selected Item'}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => setIsPersonaModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                            >
                                <Trash2 size={24} className="rotate-45" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Primary Contact Row */}
                            <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4">Primary Contact</h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                    <div className="md:col-span-1 flex justify-center">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border-2 border-white shadow-sm">
                                            {primaryAvatarId ? (
                                                <img
                                                    src={`/avatars/${avatars?.find((a: any) => a.id.toString() === primaryAvatarId)?.name}.svg`}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${primaryFirstName || 'U'}&background=random`;
                                                    }}
                                                />
                                            ) : (
                                                <span>{primaryFirstName?.[0]?.toUpperCase() || 'P'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:col-span-4">
                                        <p className="font-semibold text-gray-900">{primarySalutation} {primaryFirstName} {primaryLastName}</p>
                                        <p className="text-xs text-gray-500">{primaryJobTitleName || 'No Designation'}</p>
                                    </div>
                                    <div className="md:col-span-7">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Customer Persona</label>
                                        <select
                                            value={watch('persona_id') || ''}
                                            onChange={(e) => !isFrozen && setValue('persona_id', e.target.value)}
                                            disabled={isFrozen}
                                            className="w-full rounded-lg border-gray-200 shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all border disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Select Persona</option>
                                            {personas?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Contacts */}
                            {contacts.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Other Contacts ({contacts.length})</h4>
                                    {contacts.map((contact, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all bg-white shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                                <div className="md:col-span-1 flex justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold overflow-hidden border-2 border-white">
                                                        {contact.avatar_id ? (
                                                            <img
                                                                src={`/avatars/${avatars?.find((a: any) => a.id.toString() === contact.avatar_id)?.name}.svg`}
                                                                alt="Avatar"
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${contact.name || 'U'}&background=random`;
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{contact.name?.[0]?.toUpperCase() || 'C'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <p className="font-medium text-gray-900">{contact.name || `Contact ${idx + 1}`}</p>
                                                    <p className="text-xs text-gray-500">{contact.designation || 'No Designation'}</p>
                                                </div>
                                                <div className="md:col-span-7">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Customer Persona</label>
                                                    <select
                                                        value={contact.persona_id || ''}
                                                        onChange={(e) => !isFrozen && updateContact(idx, 'persona_id', e.target.value)}
                                                        disabled={isFrozen}
                                                        className="w-full rounded-lg border-gray-200 shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all border disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                    >
                                                        <option value="">Select Persona</option>
                                                        {personas?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {contacts.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                    <p className="text-sm">No additional contacts added yet.</p>
                                    <button
                                        onClick={addContact}
                                        className="text-blue-600 font-medium text-sm mt-2 hover:underline"
                                    >
                                        + Add a contact
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsPersonaModalOpen(false)}
                                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
                            >
                                Save & Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
