import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCreateUser, useUpdateUser } from '../hooks/use-users';
import { useRolesLookup } from '../hooks/use-roles-lookup';
import type { ManagedUser } from '../types/user.types';
import { useCrudForm } from '@/lib/use-crud-form';

interface FormState {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  password: '',
  roleId: '',
  isActive: true,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: ManagedUser | null; // null/undefined = mode create
  isSelf: boolean; // true jika user yang diedit = akun yang sedang login
}

export function UserFormDialog({ open, onOpenChange, user, isSelf }: Props) {
  const { data: roles } = useRolesLookup();
  const { form, setForm, isEdit, isSaving, handleSubmit } = useCrudForm<ManagedUser, FormState>({
    open,
    entity: user,
    emptyForm: EMPTY_FORM,
    mapToForm: (u) => ({ fullName: u.fullName, email: u.email, password: '', roleId: u.role.id, isActive: u.isActive }),
    createMutation: useCreateUser(),
    updateMutation: useUpdateUser(),
    getId: (u) => u.id,
    onSuccess: () => onOpenChange(false),
    successMessage: { create: 'User berhasil ditambahkan', update: 'User berhasil diperbarui' },
    errorMessage: 'Gagal menyimpan user',
    // UpdateUserDto sengaja tidak punya field password (ganti password = endpoint terpisah,
    // lihat ChangePasswordDialog) dan backend pakai whitelist:true — kalau field ini ikut
    // terkirim saat update, request ditolak 400, bukan diabaikan diam-diam.
    omitOnUpdate: ['password'],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Tambah User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              maxLength={150}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              maxLength={150}
              required
            />
          </div>

          {!isEdit && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={8}
                maxLength={100}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="roleId">Role</Label>
            <Select
              id="roleId"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              required
            >
              <option value="" disabled>
                Pilih role...
              </option>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="isActive">Status</Label>
            <Select
              id="isActive"
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
              disabled={isSelf}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
            {isSelf && <p className="mt-1 text-xs text-text-muted">Status akun sendiri tidak bisa diubah.</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
