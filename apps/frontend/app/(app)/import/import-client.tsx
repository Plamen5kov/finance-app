'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface ImportResult {
  imported: number;
  expenses: number;
  income: number;
  skipped: number;
  newMappings: number;
}

const IMPORT_TYPES = [
  {
    id: 'revolut',
    nameKey: 'import.revolutName' as const,
    descKey: 'import.revolutDesc' as const,
    accept: '.csv',
    endpoint: '/import/revolut',
  },
] as const;

type ImportTypeId = (typeof IMPORT_TYPES)[number]['id'];

export function ImportClient() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<ImportTypeId | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async ({ endpoint, file }: { endpoint: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<ImportResult>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setResult(null);
    },
  });

  function handleFileSelect(endpoint: string) {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setResult(null);
    setError(null);
    importMutation.mutate({ endpoint, file });
  }

  const activeType = IMPORT_TYPES.find((t) => t.id === selectedType);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('import.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('import.subtitle')}</p>
      </div>

      {/* Import type cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {IMPORT_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setSelectedType(type.id);
              setResult(null);
              setError(null);
            }}
            className={`text-left p-5 rounded-xl border transition-all ${
              selectedType === type.id
                ? 'border-brand bg-brand/5 ring-1 ring-brand'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <FileText size={20} className="text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{t(type.nameKey)}</h3>
                <p className="text-xs text-gray-500 mt-1">{t(type.descKey)}</p>
              </div>
            </div>
          </button>
        ))}

        {/* Placeholder for future imports */}
        <div className="p-5 rounded-xl border border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-sm text-gray-400">{t('import.moreComingSoon')}</p>
        </div>
      </div>

      {/* Upload area */}
      {activeType && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-medium text-gray-900 mb-4">{t('import.upload', { name: t(activeType.nameKey) })}</h2>

          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-brand hover:bg-gray-50 transition-colors">
            <Upload size={32} className="text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">{t('import.clickToSelect')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('import.csvOnly')}</p>
            <input
              ref={fileRef}
              type="file"
              accept={activeType.accept}
              className="hidden"
              onChange={() => handleFileSelect(activeType.endpoint)}
            />
          </label>

          {importMutation.isPending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              {t('import.importing')}
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <CheckCircle size={16} />
                {t('import.complete')}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">{t('import.imported')}</p>
                  <p className="font-semibold text-gray-900">{result.imported}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('import.expenses')}</p>
                  <p className="font-semibold text-red-600">{result.expenses}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('import.income')}</p>
                  <p className="font-semibold text-green-600">{result.income}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('import.skipped')}</p>
                  <p className="font-semibold text-gray-400">{result.skipped}</p>
                </div>
                <div>
                  <p className="text-gray-500">{t('import.newMappings')}</p>
                  <p className="font-semibold text-gray-900">{result.newMappings}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
