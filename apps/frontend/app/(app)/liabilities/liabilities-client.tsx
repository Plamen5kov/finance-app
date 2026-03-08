'use client';

import { useState, useMemo } from 'react';
import {
  useLiabilities,
  useCreateLiability,
  useUpdateLiability,
  useDeleteLiability,
  CreateLiabilityInput,
  Liability,
} from '@/hooks/use-liabilities';
import { LIABILITY_TYPES } from '@finances/shared';
import { LiabilityCard } from '@/components/liabilities/liability-card';
import { LiabilityForm } from '@/components/liabilities/liability-form';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import { Plus, AlertTriangle } from 'lucide-react';

function EditLiabilityModal({ liability, onClose }: { liability: Liability; onClose: () => void }) {
  const update = useUpdateLiability(liability.id);

  async function handleSubmit(input: CreateLiabilityInput) {
    await update.mutateAsync(input);
    onClose();
  }

  return (
    <Modal title={`Edit — ${liability.name}`} onClose={onClose}>
      <LiabilityForm
        defaultValues={{ ...liability, metadata: liability.metadata ?? undefined }}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isLoading={update.isPending}
        submitLabel="Save Changes"
      />
    </Modal>
  );
}

export function LiabilitiesClient() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editing, setEditing] = useState<Liability | null>(null);

  const { data: liabilities, isLoading } = useLiabilities();
  const createLiability = useCreateLiability();
  const deleteLiability = useDeleteLiability();

  const totalLiabilities = useMemo(() => (liabilities ?? []).reduce((s, l) => s + l.value, 0), [liabilities]);

  const liabilitiesByType = useMemo(() => (liabilities ?? []).reduce<Record<string, typeof liabilities>>((acc, l) => {
    const group = acc[l.type] ?? [];
    return { ...acc, [l.type]: [...group, l] };
  }, {}), [liabilities]);

  async function handleCreate(input: CreateLiabilityInput) {
    await createLiability.mutateAsync(input);
    setShowCreateForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this liability?')) return;
    await deleteLiability.mutateAsync(id);
  }

  const hasLiabilities = (liabilities?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Liabilities</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark text-sm font-medium"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Total Liabilities banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-400 rounded-xl p-4 sm:p-6 text-white mb-8">
        <div className="flex items-center gap-2 mb-1 text-white/80 text-sm">
          <AlertTriangle size={16} />
          <span>Total Liabilities</span>
        </div>
        <p className="text-2xl sm:text-4xl font-bold">
          {isLoading ? '—' : formatCurrency(totalLiabilities)}
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && !hasLiabilities && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No liabilities tracked</p>
          <p className="text-sm mt-1">Add a mortgage or loan to track what you owe</p>
        </div>
      )}

      {!isLoading && hasLiabilities && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Liabilities</h2>
            <span className="text-sm font-semibold text-red-500">{formatCurrency(totalLiabilities)}</span>
          </div>
          {LIABILITY_TYPES.map((type) => {
            const group = liabilitiesByType[type];
            if (!group?.length) return null;
            const subtotal = group.reduce((s, l) => s + l.value, 0);
            return (
              <section key={type} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </h3>
                  <span className="text-sm font-semibold text-gray-700">{formatCurrency(subtotal)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.map((liability) => (
                    <LiabilityCard
                      key={liability.id}
                      liability={liability}
                      onDelete={handleDelete}
                      onEdit={setEditing}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {showCreateForm && (
        <Modal title="Add Liability" onClose={() => setShowCreateForm(false)}>
          <LiabilityForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createLiability.isPending}
          />
        </Modal>
      )}

      {editing && (
        <EditLiabilityModal liability={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
