import { useState } from 'react';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';
import { Pagination } from '@/components/shared/pagination';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { useUsersList, useDeleteUser } from '../hooks/use-users';
import { useRolesLookup } from '../hooks/use-roles-lookup';
import { UserTable } from '../components/user-table';
import { UserFormDialog } from '../components/user-form-dialog';
import { ChangePasswordDialog } from '../components/change-password-dialog';
import { useAuthStore } from '@/store/auth.store';
import type { ManagedUser, UserQueryParams } from '../types/user.types';
import { useCrudDialogState, useCrudDelete } from '@/lib/use-crud-dialog-state';

const DEFAULT_PARAMS: UserQueryParams = {
  page: 1,
  limit: 20,
  search: '',
  roleId: '',
  isActive: '',
};

export function UserManagementPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [params, setParams] = useState<UserQueryParams>(DEFAULT_PARAMS);
  const dialog = useCrudDialogState<ManagedUser>();
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);

  const { data, isLoading } = useUsersList(params);
  const { data: roles } = useRolesLookup();
  const deleteMutation = useDeleteUser();
  const { deletingItem, setDeletingItem, confirmDelete } = useCrudDelete<ManagedUser>({
    deleteMutation,
    getId: (user) => user.id,
    successMessage: (user) => `User "${user.fullName}" berhasil dihapus`,
    errorMessage: 'Gagal menghapus user',
  });

  return (
    <div className="space-y-4">
      <PageHeader
        icon={UsersIcon}
        title="User Management"
        description="Kelola akun user dan role akses ke sistem."
        action={
          <Button onClick={dialog.openCreate}>
            <Plus className="h-4 w-4" />
            Tambah User
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <SearchInput
            value={params.search ?? ''}
            onChange={(search) => setParams((p) => ({ ...p, search, page: 1 }))}
            placeholder="Cari nama / email..."
          />
          <Select
            className="w-44"
            value={params.roleId}
            onChange={(e) => setParams((p) => ({ ...p, roleId: e.target.value, page: 1 }))}
          >
            <option value="">Semua Role</option>
            {roles?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-40"
            value={params.isActive}
            onChange={(e) => setParams((p) => ({ ...p, isActive: e.target.value, page: 1 }))}
          >
            <option value="">Semua Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <UserTable
            users={data?.data ?? []}
            isLoading={isLoading}
            currentUserId={currentUserId}
            onEdit={dialog.openEdit}
            onChangePassword={setPasswordUser}
            onDelete={setDeletingItem}
          />
        </div>

        {data?.meta && <Pagination meta={data.meta} onPageChange={(page) => setParams((p) => ({ ...p, page }))} />}
      </Card>

      <UserFormDialog
        open={dialog.formOpen}
        onOpenChange={dialog.setFormOpen}
        user={dialog.editingItem}
        isSelf={Boolean(dialog.editingItem && dialog.editingItem.id === currentUserId)}
      />

      <ChangePasswordDialog open={Boolean(passwordUser)} onOpenChange={(open) => !open && setPasswordUser(null)} user={passwordUser} />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        title="Hapus User"
        description={`User "${deletingItem?.fullName}" akan dihapus dan tidak bisa login lagi.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
