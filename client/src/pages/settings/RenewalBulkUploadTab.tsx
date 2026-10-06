import React, { useState } from 'react';
import {
  Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  FileCheck, RefreshCw, Layers, ShieldAlert, Check, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

type TemplateType = 'FULL_RENEWAL' | 'TRINETRA_V2' | 'MASTERS';

interface RowError {
  rowNumber: number;
  column: string;
  value: any;
  message: string;
}

interface ImportSummary {
  companiesCreated: number;
  contactsCreated: number;
  accountsCreated: number;
  instancesCreated: number;
  cyclesCreated: number;
}

export default function RenewalBulkUploadTab() {
  const [templateType, setTemplateType] = useState<TemplateType>('FULL_RENEWAL');
  const [file, setFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalRows: number;
    importedCount: number;
    failedCount: number;
    errors: RowError[];
    summary?: ImportSummary;
  } | null>(null);

  // ── 1. Download Template Handler ──────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true);
      const response = await api.get(`/renewals/bulk-upload/template?type=${templateType}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        templateType === 'FULL_RENEWAL'
          ? 'ANGLER_Full_Renewal_Bulk_Import_Template.xlsx'
          : templateType === 'TRINETRA_V2'
            ? 'TRINETRA_Full_Renewal_Bulk_Import_Template.xlsx'
            : 'ANGLER_Masters_Bulk_Import_Template.xlsx'
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Dynamic Excel template downloaded with live database dropdowns!');
    } catch (err: any) {
      toast.error('Failed to download template. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  // ── 2. Process Upload Handler ─────────────────────────────────────────────
  const handleProcessUpload = async () => {
    if (!file) {
      toast.error('Please select an Excel file (.xlsx) first');
      return;
    }

    try {
      setIsUploading(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', templateType);

      const res = await api.post('/renewals/bulk-upload/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const resultData = res.data.result;
      setImportResult(resultData);
      toast.success(`Successfully imported ${resultData.importedCount} renewal records!`);
      setFile(null);
    } catch (err: any) {
      const errResponse = err?.response?.data;
      if (errResponse?.result) {
        setImportResult(errResponse.result);
        toast.error(`Import failed: ${errResponse.result.failedCount} validation errors found`);
      } else {
        toast.error(errResponse?.message || 'Error uploading file');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-blue-300" size={24} />
            <h2 className="text-lg font-bold">Bulk Renewal & Masters Import Suite</h2>
          </div>
          <p className="text-xs text-blue-200 mt-1 max-w-2xl">
            Import full end-to-end renewals or master reference data safely. Features dynamic Excel validation dropdowns generated on-the-fly from live database master lists.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-950/60 p-1.5 rounded-lg border border-blue-700/50">
          <button
            onClick={() => setTemplateType('FULL_RENEWAL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              templateType === 'FULL_RENEWAL' ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-200 hover:text-white'
            }`}
          >
            ANGLER Full Template
          </button>
          <button
            onClick={() => setTemplateType('TRINETRA_V2')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              templateType === 'TRINETRA_V2' ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-200 hover:text-white'
            }`}
          >
            TRINETRA Full Template
          </button>
          <button
            onClick={() => setTemplateType('MASTERS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              templateType === 'MASTERS' ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-200 hover:text-white'
            }`}
          >
            Masters Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Download Template */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800">
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">1</span>
            <h3 className="text-sm font-bold">Download Dynamic Excel Template</h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {templateType === 'FULL_RENEWAL'
              ? 'Includes ANGLER end-to-end renewal fields (Company, Contact, Category, Service, Provider, Account, Plan, Pricing, Activation/Expiry Dates, Quantity, Amount, Status, and Policy assignment) with live dropdown lists.'
              : templateType === 'TRINETRA_V2'
                ? 'Includes TRINETRA renewal fields for FMS, IoT, iWay, and 4G Dome Camera imports with company-specific live dropdown lists.'
                : 'Includes master data structure for bulk adding Categories, Sub-categories, Service Masters, Plans, Providers, and Contacts.'}
          </p>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Check size={14} className="text-emerald-600" /> Dynamic Live Master Dropdowns inside Excel
            </div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Check size={14} className="text-emerald-600" /> Automatic Existing vs New Entity Resolution
            </div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Check size={14} className="text-emerald-600" /> Strict Date & Amount Format Formatting
            </div>
          </div>

          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloading}
            className="w-full btn btn-primary text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm"
          >
            {isDownloading ? <RefreshCw className="animate-spin" size={14} /> : <Download size={14} />}
            {isDownloading ? 'Generating Template...' : 'Download Template (.xlsx)'}
          </button>
        </div>

        {/* Step 2: Upload & Execute */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-slate-800">
            <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">2</span>
            <h3 className="text-sm font-bold">Upload Filled Template & Import</h3>
          </div>

          <p className="text-xs text-slate-600">
            Select your completed Excel file below and click <strong>Import Now</strong> to execute transactional ingestion.
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="bulk-excel-input"
            />
            <label htmlFor="bulk-excel-input" className="cursor-pointer space-y-2 block">
              <Upload className="mx-auto text-slate-400" size={28} />
              {file ? (
                <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg inline-block border border-blue-200">
                  📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ) : (
                <div className="text-xs text-slate-600">
                  <span className="text-blue-600 font-bold hover:underline">Click to browse</span> or drag and drop your Excel file
                </div>
              )}
            </label>
          </div>

          <button
            onClick={handleProcessUpload}
            disabled={!file || isUploading}
            className="w-full btn btn-primary text-xs py-2.5 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isUploading ? <RefreshCw className="animate-spin" size={14} /> : <FileCheck size={14} />}
            {isUploading ? 'Validating & Importing...' : 'Import Now'}
          </button>
        </div>
      </div>

      {/* ── 3. Results Section ────────────────────────────────────────────────── */}
      {importResult && (
        <div className="space-y-4">
          {importResult.success ? (
            /* SUCCESS BANNER */
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3 text-emerald-900 font-bold text-base">
                <CheckCircle2 size={24} className="text-emerald-600" />
                Bulk Import Executed Successfully!
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-slate-500 font-medium">Total Rows</div>
                  <div className="text-base font-bold text-slate-900">{importResult.totalRows}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-slate-500 font-medium">Companies Created</div>
                  <div className="text-base font-bold text-emerald-700">{importResult.summary?.companiesCreated || 0}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-slate-500 font-medium">Contacts Created</div>
                  <div className="text-base font-bold text-emerald-700">{importResult.summary?.contactsCreated || 0}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-slate-500 font-medium">Accounts Created</div>
                  <div className="text-base font-bold text-emerald-700">{importResult.summary?.accountsCreated || 0}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-slate-500 font-medium">Cycles Created</div>
                  <div className="text-base font-bold text-emerald-700">{importResult.summary?.cyclesCreated || 0}</div>
                </div>
              </div>
            </div>
          ) : (
            /* ERROR REPORT TABLE */
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-900 font-bold text-sm">
                  <AlertTriangle size={20} className="text-rose-600" />
                  Import Failed: {importResult.failedCount} Validation Errors Found
                </div>
                <span className="text-xs text-rose-700 font-semibold">Please fix these rows in Excel and re-upload</span>
              </div>

              <div className="overflow-x-auto max-h-80 rounded-lg border border-rose-200 bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-rose-100 text-rose-950 font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="p-2.5 w-16 text-center">Row #</th>
                      <th className="p-2.5 w-44">Column / Field</th>
                      <th className="p-2.5 w-36">Submitted Value</th>
                      <th className="p-2.5">Error Description & Guidance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 text-slate-800">
                    {importResult.errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/50">
                        <td className="p-2.5 text-center font-bold text-rose-700">{err.rowNumber}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{err.column}</td>
                        <td className="p-2.5 font-mono text-slate-600">{String(err.value ?? '-')}</td>
                        <td className="p-2.5 font-medium text-rose-800">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
