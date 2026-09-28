import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  changeUserPassword,
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
} from '../api/users.api';
import type { CreateUserFormValues, UpdateUserFormValues, UserQueryParams } from '../types/user.types';

const USERS_KEY = 'users';

export function useUsersList(params: UserQueryParams) {
  return useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: () => fetchUsers(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserFormValues) => createUser(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UpdateUserFormValues> }) =>
      updateUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}

export function useChangeUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => changeUserPassword(id, newPassword),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [USERS_KEY] }),
  });
}
