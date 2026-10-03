import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import clsx from 'clsx';
import dayjs from 'dayjs';

interface ResponsibilityOption {
    id: number;
    first_name: string;
    last_name?: string | null;
    role?: string;
}

interface POAModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: any;
    isSubmitting?: boolean;
    productId?: number;
    productName?: string;
    responsibilityOptions?: ResponsibilityOption[];
    currentUserName?: string; // auto-populated for new POAs
}

export default function POAModal({ isOpen, onClose, onSubmit, initialData, isSubmitting, productId, productName, responsibilityOptions = [], currentUserName }: POAModalProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    ...initialData,
                    product_id: productId ?? initialData.product_id,
                    date_of_meeting: initialData.date_of_meeting ? dayjs(initialData.date_of_meeting).format('YYYY-MM-DD') : '',
                    edc: initialData.edc ? dayjs(initialData.edc).format('YYYY-MM-DD') : '',
                    revised_edc: initialData.revised_edc ? dayjs(initialData.revised_edc).format('YYYY-MM-DD') : '',
                    adc: initialData.adc ? dayjs(initialData.adc).format('YYYY-MM-DD') : '',
                });
            } else {
                reset({
                    product_id: productId ?? '',
                    date_of_meeting: dayjs().format('YYYY-MM-DD'),
                    poa_description: '',
                    responsibility: currentUserName ?? '',
                    edc: '',
                    revised_edc: '',
                    status: 'Pending',
                    adc: '',
                });
            }
        }
    }, [isOpen, initialData, reset, productId]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box max-w-2xl">
                <div className="modal-header">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">{initialData ? 'Edit POA' : 'Create New POA'}</h2>
                        {productName && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                Product / Service: <span className="font-semibold text-primary-600">{productName}</span>
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="btn btn-ghost btn-icon text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                    {/* Hidden product_id */}
                    <input type="hidden" {...register('product_id')} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Date of Meeting */}
                        <div className="form-group">
                            <label className="form-label">Date of Meeting *</label>
                            <input
                                type="date"
                                {...register('date_of_meeting', { required: 'Date of meeting is required' })}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className={clsx('form-input', errors.date_of_meeting && 'form-input-error')}
                            />
                            {errors.date_of_meeting && <p className="form-error">{String(errors.date_of_meeting.message)}</p>}
                        </div>

                        {/* Responsibility */}
                        <div className="form-group">
                            <label className="form-label">Responsibility *</label>
                            {responsibilityOptions.length > 0 ? (
                                <select
                                    {...register('responsibility', { required: 'Responsibility is required' })}
                                    className={clsx('form-select', errors.responsibility && 'form-input-error')}
                                >
                                    <option value="">— Select person —</option>
                                    {responsibilityOptions.map(u => (
                                        <option key={u.id} value={`${u.first_name}${u.last_name ? ' ' + u.last_name : ''}`}>
                                            {u.first_name}{u.last_name ? ` ${u.last_name}` : ''}
                                            {u.role === 'CEO' ? ' (Admin)' : u.role === 'SalesManager' ? ' (Manager)' : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="Who is responsible?"
                                    {...register('responsibility', { required: 'Responsibility is required' })}
                                    className={clsx('form-input', errors.responsibility && 'form-input-error')}
                                />
                            )}
                            {errors.responsibility && <p className="form-error">{String(errors.responsibility.message)}</p>}
                        </div>

                        {/* POA Description */}
                        <div className="form-group md:col-span-2">
                            <label className="form-label">POA Description *</label>
                            <textarea
                                rows={3}
                                placeholder="Describe the Plan of Action..."
                                {...register('poa_description', { required: 'Description is required' })}
                                className={clsx('form-textarea', errors.poa_description && 'form-input-error')}
                            />
                            {errors.poa_description && <p className="form-error">{String(errors.poa_description.message)}</p>}
                        </div>

                        {/* EDC */}
                        <div className="form-group">
                            <label className="form-label">EDC (Estimated Date of Completion)</label>
                            <input
                                type="date"
                                {...register('edc')}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="form-input"
                                required
                            />
                        </div>

                        {/* Revised EDC */}
                        <div className="form-group">
                            <label className="form-label">Revised EDC</label>
                            <input
                                type="date"
                                {...register('revised_edc')}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="form-input"
                            />
                        </div>

                        {/* Status */}
                        <div className="form-group">
                            <label className="form-label">Status *</label>
                            <select
                                {...register('status', { required: 'Status is required' })}
                                className="form-select"
                            >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>

                        {/* ADC */}
                        <div className="form-group">
                            <label className="form-label">ADC (Actual Date of Completion)</label>
                            <input
                                type="date"
                                {...register('adc')}
                                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="modal-footer -mx-6 mt-6">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="btn btn-primary disabled:opacity-50">
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Save size={15} />
                                    Save POA
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
