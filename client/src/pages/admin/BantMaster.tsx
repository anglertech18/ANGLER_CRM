import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
    Plus, Edit, Trash2, ArrowLeft, Database, ChevronDown, ChevronRight,
    HelpCircle, AlertCircle,
} from 'lucide-react';
import BantCategoryForm from './BantCategoryForm';
import BantQuestionForm from './BantQuestionForm';
import Table, { type TableColumn } from '../../components/Table';

type Category = {
    id: number; code: string; name: string; status: string;
    _count?: { questions: number };
};
type Question = {
    id: number; category_id: number; question: string; sort_order: number; is_active: boolean;
};

export default function BantMaster() {
    const queryClient = useQueryClient();
    const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
    const [catModal, setCatModal] = useState<{ open: boolean; data?: Category }>({ open: false });
    const [qModal, setQModal] = useState<{ open: boolean; categoryId?: number; categoryName?: string; data?: Question }>({ open: false });

    const { data: categories = [], isLoading, isError, error } = useQuery<Category[]>({
        queryKey: ['bant-categories-admin'],
        queryFn: () => api.get('/masters/bant-categories/admin').then(r => r.data),
    });

    const deleteCatMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/masters/bant-categories/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bant-categories-admin'] }),
    });

    const toggleCat = (id: number) => {
        setExpandedCats(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    if (isLoading) return (
        <div className="page-wrapper">
            <div className="flex items-center gap-3 mb-6">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="skeleton h-5 w-48 rounded" />
            </div>
            <div className="card overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-slate-50">
                        <div className="skeleton h-3 w-8 rounded" />
                        <div className="skeleton h-3 w-48 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );

    if (isError) return (
        <div className="page-wrapper">
            <div className="card p-4 flex items-center gap-3 text-red-600 border-red-200">
                <AlertCircle size={16} />
                <span className="text-sm font-medium">{(error as any)?.response?.data?.message || (error as any)?.message}</span>
            </div>
        </div>
    );

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/masters"
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Database size={14} className="text-primary-600" />
                        </div>
                        <div>
                            <h1 className="page-title">BANT Qualification Master</h1>
                            <p className="text-xs text-slate-400">Manage categories and qualification questions</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => setCatModal({ open: true })} className="btn btn-primary">
                    <Plus size={15} />
                    Add Category
                </button>
            </div>

            <div className="space-y-3">
                {!categories.length ? (
                    <div className="card p-10 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3 mx-auto">
                            <Database size={18} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">No BANT categories found</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Add Category" to create the first category (e.g. Budget, Authority, Need, Timeline).</p>
                    </div>
                ) : categories.map((cat) => (
                    <CategoryRow
                        key={cat.id}
                        cat={cat}
                        expanded={expandedCats.has(cat.id)}
                        onToggle={() => toggleCat(cat.id)}
                        onEditCat={() => setCatModal({ open: true, data: cat })}
                        onDeleteCat={() => {
                            if (window.confirm(`Delete category "${cat.name}"? This will also deactivate its questions.`)) {
                                deleteCatMutation.mutate(cat.id);
                            }
                        }}
                        onAddQuestion={() => setQModal({ open: true, categoryId: cat.id, categoryName: cat.name })}
                        onEditQuestion={(q) => setQModal({ open: true, categoryId: cat.id, categoryName: cat.name, data: q })}
                    />
                ))}
            </div>

            {catModal.open && (
                <BantCategoryForm initialData={catModal.data} onClose={() => setCatModal({ open: false })} />
            )}
            {qModal.open && qModal.categoryId && (
                <BantQuestionForm
                    categoryId={qModal.categoryId}
                    categoryName={qModal.categoryName!}
                    initialData={qModal.data}
                    onClose={() => setQModal({ open: false })}
                />
            )}
        </div>
    );
}

function CategoryRow({
    cat, expanded, onToggle, onEditCat, onDeleteCat, onAddQuestion, onEditQuestion,
}: {
    cat: Category;
    expanded: boolean;
    onToggle: () => void;
    onEditCat: () => void;
    onDeleteCat: () => void;
    onAddQuestion: () => void;
    onEditQuestion: (q: Question) => void;
}) {
    const queryClient = useQueryClient();

    const { data: questions = [], isFetching } = useQuery<Question[]>({
        queryKey: ['bant-questions-admin', cat.id],
        queryFn: () => api.get(`/masters/bant-questions/admin?category_id=${cat.id}`).then(r => r.data),
        enabled: expanded,
    });

    const deleteQMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/masters/bant-questions/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bant-questions-admin', cat.id] }),
    });

    const questionColumns: TableColumn<Question>[] = [
        { key: 'idx', header: '#', width: 'w-8', render: (_q, i) => <span className="text-slate-400 text-xs">{i + 1}</span> },
        { key: 'sort_order', header: 'Order', width: 'w-14', align: 'center', render: q => <span className="text-slate-500 text-sm">{q.sort_order}</span> },
        { key: 'question', header: 'Question', render: q => <span className="text-slate-700 text-sm break-words whitespace-normal min-w-0">{q.question}</span> },
        {
            key: 'is_active', header: 'Status', width: 'w-20', align: 'center', thClassName: 'hidden sm:table-cell', className: 'hidden sm:table-cell',
            render: q => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${q.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {q.is_active ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            key: 'actions', header: 'Actions', width: 'w-20', align: 'right', render: q => (
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEditQuestion(q)} className="btn btn-ghost btn-sm btn-icon text-primary-600" title="Edit">
                        <Edit size={13} />
                    </button>
                    <button
                        onClick={() => { if (window.confirm('Delete this question?')) deleteQMutation.mutate(q.id); }}
                        className="btn btn-ghost btn-sm btn-icon text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="card overflow-hidden">
            {/* Category Header */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm shrink-0">
                        {cat.code}
                    </span>
                    <div className="min-w-0">
                        <span className="font-semibold text-slate-800 truncate block sm:inline">{cat.name}</span>
                        <span className="ml-1 text-xs text-slate-400 whitespace-nowrap">({cat._count?.questions ?? 0} questions)</span>
                    </div>
                    <span className={`hidden sm:inline-flex shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${cat.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cat.status}
                    </span>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={onAddQuestion} className="btn btn-ghost btn-sm gap-1 text-primary-600" title="Add Question">
                        <Plus size={14} /> Question
                    </button>
                    <button onClick={onEditCat} className="btn btn-ghost btn-sm btn-icon text-primary-600" title="Edit Category">
                        <Edit size={14} />
                    </button>
                    <button onClick={onDeleteCat} className="btn btn-ghost btn-sm btn-icon text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete Category">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Questions List */}
            {expanded && (
                <div className="border-t border-slate-100">
                    {isFetching && !questions.length ? (
                        <div className="px-6 py-4 text-sm text-slate-400">Loading questions...</div>
                    ) : !questions.length ? (
                        <div className="px-6 py-6 text-center">
                            <HelpCircle size={20} className="text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No questions yet</p>
                            <button onClick={onAddQuestion} className="mt-2 text-xs text-primary-600 hover:underline">
                                Add the first question
                            </button>
                        </div>
                    ) : (
                        <Table
                            columns={questionColumns}
                            data={questions}
                            getRowKey={q => q.id}
                            className="table-fixed"
                        />
                    )}
                </div>
            )}
        </div>
    );
}
