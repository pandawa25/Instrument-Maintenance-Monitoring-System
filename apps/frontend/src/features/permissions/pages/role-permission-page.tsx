import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { usePermissionMatrix, useUpdateRolePermission } from '../hooks/use-permissions';
import { PermissionMatrixTable } from '../components/permission-matrix-table';
import { getErrorMessage } from '@/lib/axios';
import type { RolePermissionCell } from '../types/permission.types';

export function RolePermissionPage() {
  const { data: roles, isLoading } = usePermissionMatrix();
  const updateMutation = useUpdateRolePermission();

  async function handleToggle(
    roleId: string,
    cell: RolePermissionCell,
    flag: keyof Omit<RolePermissionCell, 'module'>,
  ) {
    const payload = {
      canView: cell.canView,
      canCreate: cell.canCreate,
      canEdit: cell.canEdit,
      canDelete: cell.canDelete,
      [flag]: !cell[flag],
    };
    try {
      await updateMutation.mutateAsync({ roleId, module: cell.module, payload });
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan perubahan hak akses'));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ShieldCheck}
        title="Matriks Role & Permission"
        description="Atur hak akses (lihat/tambah/ubah/hapus) tiap role untuk setiap modul. Role Admin selalu full access dan tidak ditampilkan di sini."
      />

      <Card>
        {isLoading && <div className="p-6 text-sm text-text-muted">Memuat matriks hak akses...</div>}
        {!isLoading && roles && (
          <PermissionMatrixTable
            roles={roles}
            onToggle={handleToggle}
            savingKey={
              updateMutation.isPending && updateMutation.variables
                ? `${updateMutation.variables.roleId}:${updateMutation.variables.module}`
                : null
            }
          />
        )}
      </Card>
    </div>
  );
}
