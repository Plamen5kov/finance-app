'use client';

import { useState } from 'react';
import { Copy, Check, Trash2, UserPlus, Users } from 'lucide-react';
import {
  useHouseholdMembers,
  useHouseholdInvites,
  useCreateInvite,
  useRevokeInvite,
  useUpdateMemberRole,
  type HouseholdMember,
} from '@/hooks/use-household';

export function AccountClient() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account</h1>
      <div className="space-y-6 max-w-2xl">
        <MembersSection />
        <InvitesSection />
      </div>
    </div>
  );
}

function MembersSection() {
  const { data: members, isLoading } = useHouseholdMembers();
  const isOwner = members?.some((m) => m.role === 'owner');

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={18} className="text-gray-500" />
        <h2 className="text-lg font-semibold">Household Members</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-2">
          {members?.map((m) => (
            <MemberRow key={m.id} member={m} canEdit={!!isOwner && m.role !== 'owner'} />
          ))}
        </div>
      )}
    </section>
  );
}

function MemberRow({ member, canEdit }: { member: HouseholdMember; canEdit: boolean }) {
  const updateRole = useUpdateMemberRole();

  function handleRoleChange(newRole: string) {
    updateRole.mutate({ memberId: member.id, role: newRole });
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
      <div>
        <p className="text-sm font-medium text-gray-900">{member.name ?? member.email}</p>
        {member.name && <p className="text-xs text-gray-500">{member.email}</p>}
      </div>
      {canEdit ? (
        <select
          value={member.role}
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={updateRole.isPending}
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
        >
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
      ) : (
        <span className="text-xs text-gray-400 capitalize">{member.role}</span>
      )}
    </div>
  );
}

function InvitesSection() {
  const { data: invites, isLoading } = useHouseholdInvites();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('member');

  async function handleCopy(link: string, id: string) {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="text-gray-500" />
          <h2 className="text-lg font-semibold">Invite Links</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700"
          >
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={() => createInvite.mutate(newRole)}
            disabled={createInvite.isPending}
            className="text-sm bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-dark disabled:opacity-60 transition-colors"
          >
            {createInvite.isPending ? 'Creating...' : 'Create Invite'}
          </button>
        </div>
      </div>

      {createInvite.isError && (
        <p className="text-sm text-red-600 mb-3">{createInvite.error.message}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : !invites?.length ? (
        <p className="text-sm text-gray-400">No active invites. Create one to share with your partner.</p>
      ) : (
        <div className="space-y-2">
          {invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-gray-600 truncate">{inv.link}</p>
                <p className="text-xs text-gray-400">
                  Role: <span className="capitalize">{inv.role}</span> &middot; Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleCopy(inv.link, inv.id)}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                title="Copy link"
              >
                {copiedId === inv.id ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
              </button>
              <button
                onClick={() => revokeInvite.mutate(inv.id)}
                disabled={revokeInvite.isPending}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                title="Revoke invite"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
