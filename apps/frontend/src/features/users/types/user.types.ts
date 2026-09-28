export interface RoleRef {
  id: string;
  name: string;
}

export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: RoleRef;
}

export interface CreateUserFormValues {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
}

export interface UpdateUserFormValues {
  fullName: string;
  email: string;
  roleId: string;
  isActive: boolean;
}

export interface UserQueryParams {
  page: number;
  limit: number;
  search?: string;
  roleId?: string | '';
  isActive?: string | ''; // '' = semua, 'true'/'false' dikirim sebagai query string
}
