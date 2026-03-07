import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Documents' };

export default function DocumentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Documents</h1>
      <div className="bg-white rounded-lg shadow p-8 text-center border-2 border-dashed border-gray-300">
        <p className="text-gray-500">Drag & drop CSV or PDF bank statements here</p>
        <button className="mt-4 bg-brand text-white px-4 py-2 rounded hover:bg-brand-dark text-sm">
          Browse files
        </button>
      </div>
    </div>
  );
}
