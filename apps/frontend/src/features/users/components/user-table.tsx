import { Pencil, Trash2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { ManagedUser } from '../types/user.types';

interface Props {
  users: ManagedUser[];
  isLoading: boolean;
  currentUserId?: string;
  onEdit: (user: ManagedUser) => void;
  onChangePassword: (user: ManagedUser) => void;
  onDelete: (user: ManagedUser) => void;
}

export function UserTable({ users, isLoading, currentUserId, onEdit, onChangePassword, onDelete }: Props) {
  if (isLoading) {
    return <div className="p-8 text-center text-sm text-text-muted">Memuat data...</div>;
  }

  if (users.length === 0) {
    return <div className="p-8 text-center text-sm text-text-muted">Belum ada data user.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2 text-left text-xs uppercase tracking-wide text-text-muted">
          <th className="px-4 py-2.5 font-medium">Full Name</th>
          <th className="px-4 py-2.5 font-medium">Email</th>
          <th className="px-4 py-2.5 font-medium">Role</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium">Last Login</th>
          <th className="px-4 py-2.5 font-medium text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          return (
            <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface-2/60">
              <td className="px-4 py-2.5 text-text">
                {user.fullName}
                {isSelf && <span className="ml-1.5 text-xs text-text-muted">(Anda)</span>}
              </td>
              <td className="px-4 py-2.5 text-text-muted">{user.email}</td>
              <td className="px-4 py-2.5 text-text-muted">{user.role.name}</td>
              <td className="px-4 py-2.5">
                <StatusBadge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </td>
              <td className="px-4 py-2.5 text-text-muted">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('id-ID') : '—'}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(user)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onChangePassword(user)}
                    title="Reset Password"
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(user)}
                    title={isSelf ? 'Tidak bisa menghapus akun sendiri' : 'Delete'}
                    disabled={isSelf}
                  >
                    <Trash2 className={isSelf ? 'h-4 w-4 text-text-muted' : 'h-4 w-4 text-danger'} />
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
