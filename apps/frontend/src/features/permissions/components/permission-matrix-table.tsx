import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PERMISSION_MODULE_LABELS } from '@/types/permissions';
import type { RolePermissionCell, RolePermissionMatrixRow } from '../types/permission.types';

interface PermissionMatrixTableProps {
  roles: RolePermissionMatrixRow[];
  onToggle: (roleId: string, cell: RolePermissionCell, flag: keyof Omit<RolePermissionCell, 'module'>) => void;
  savingKey: string | null;
}

const COLUMNS: Array<{ key: keyof Omit<RolePermissionCell, 'module'>; label: string }> = [
  { key: 'canView', label: 'Lihat' },
  { key: 'canCreate', label: 'Tambah' },
  { key: 'canEdit', label: 'Ubah' },
  { key: 'canDelete', label: 'Hapus' },
];

export function PermissionMatrixTable({ roles, onToggle, savingKey }: PermissionMatrixTableProps) {
  const [activeRoleId, setActiveRoleId] = useState(roles[0]?.roleId);
  const activeRole = roles.find((r) => r.roleId === activeRoleId) ?? roles[0];

  if (!activeRole) {
    return <div className="p-6 text-sm text-text-muted">Belum ada role selain Admin.</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border p-3">
        {roles.map((role) => (
          <button
            key={role.roleId}
            type="button"
            onClick={() => setActiveRoleId(role.roleId)}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              role.roleId === activeRole.roleId
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-muted hover:bg-surface-2 hover:text-text',
            )}
          >
            {role.roleName}
          </button>
        ))}
      </div>

      {activeRole.roleDescription && (
        <p className="border-b border-border px-4 py-2.5 text-xs text-text-muted">{activeRole.roleDescription}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              <th className="px-4 py-2.5">Modul</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-4 py-2.5 text-center">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeRole.permissions.map((cell) => {
              const rowKey = `${activeRole.roleId}:${cell.module}`;
              const isSaving = savingKey?.startsWith(rowKey);
              return (
                <tr key={cell.module} className="border-b border-border last:border-0 hover:bg-surface-2/60">
                  <td className="px-4 py-2.5 font-medium text-text">{PERMISSION_MODULE_LABELS[cell.module]}</td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-border text-primary accent-[#005BAC] focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        checked={cell[col.key]}
                        disabled={isSaving}
                        onChange={() => onToggle(activeRole.roleId, cell, col.key)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
