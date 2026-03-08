'use client';

import { useTranslation } from '@/i18n';

export default function DocumentsPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('documents.title')}</h1>
      <div className="bg-white rounded-lg shadow p-8 text-center border-2 border-dashed border-gray-300">
        <p className="text-gray-500">{t('documents.dropHere')}</p>
        <button className="mt-4 bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark text-sm">
          {t('documents.browse')}
        </button>
      </div>
    </div>
  );
}
