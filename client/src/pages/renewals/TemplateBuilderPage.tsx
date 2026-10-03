import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, Eye, Code2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../../services/api';
import EmailTemplateBuilder, { type BuilderHandle, type TokenDef } from '../../components/renewal/EmailTemplateBuilder';

type ViewMode = 'builder' | 'preview';

const safeParseJson = (val: any) => {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
};

export default function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const builderRef = useRef<BuilderHandle>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('builder');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['template-builder', id],
    queryFn: () => api.get(`/renewal-templates/${id}/builder`).then(r => r.data.data ?? r.data),
    enabled: !!id,
  });

  const { data: tokens = [] } = useQuery<TokenDef[]>({
    queryKey: ['renewal-tokens'],
    queryFn: () => api.get('/renewal-templates/tokens').then(r => r.data.data ?? r.data),
    staleTime: Infinity,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { editor_json: object; compiled_html: string }) =>
      api.put(`/renewal-templates/${id}/builder`, data),
    onSuccess: () => toast.success('Template saved'),
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Save failed'),
  });

  const handleSave = async () => {
    if (!builderRef.current) return;
    setSaving(true);
    try {
      const data = builderRef.current.getData();
      await saveMutation.mutateAsync(data);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!builderRef.current) return;
    const { compiled_html } = builderRef.current.getData();
    // Ask server to render tokens with sample data
    try {
      const res = await api.post(`/renewal-templates/${id}/builder/preview`, { compiled_html });
      setPreviewHtml(res.data.data?.html ?? compiled_html);
    } catch {
      setPreviewHtml(compiled_html);
    }
    setViewMode('preview');
  };

  const isReady = !templateLoading && tokens.length > 0;

  return (
    <div
      className="flex flex-col bg-slate-900"
      style={{ height: '100vh', overflow: 'hidden' }}
    >
      {/* Builder header — dark to match GrapesJS chrome */}
      <div
        className="flex items-center gap-3 px-4 shrink-0 border-b border-slate-700"
        style={{ height: '52px', background: '#1e293b' }}
      >
        <button
          onClick={() => navigate('/renewals/templates')}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          {templateLoading ? (
            <div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
          ) : (
            <>
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {template?.name ?? 'Template Builder'}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                {template?.subject}
              </p>
            </>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('builder')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
              viewMode === 'builder'
                ? 'bg-slate-600 text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <Code2 size={13} /> Editor
          </button>
          <button
            onClick={handlePreview}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
              viewMode === 'preview'
                ? 'bg-slate-600 text-white'
                : 'text-slate-400 hover:text-white',
            )}
          >
            <Eye size={13} /> Preview
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !isReady}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
            saving
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white',
          )}
        >
          {saving ? (
            <><RefreshCw size={13} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={13} /> Save Template</>
          )}
        </button>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {!isReady ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Loading builder...</p>
            </div>
          </div>
        ) : viewMode === 'builder' ? (
          <EmailTemplateBuilder
            ref={builderRef}
            initialJson={safeParseJson(template?.editor_json)}
            initialHtml={template?.body_html}
            tokens={tokens}
            height="100%"
          />
        ) : (
          // Preview pane
          <div className="h-full overflow-auto bg-slate-100 p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[11px] text-slate-400 font-mono">Email Preview (sample data)</span>
                </div>
                <div
                  className="p-0"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setViewMode('builder')}
                  className="text-[12px] text-slate-500 hover:text-slate-700 underline"
                >
                  ← Back to editor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
