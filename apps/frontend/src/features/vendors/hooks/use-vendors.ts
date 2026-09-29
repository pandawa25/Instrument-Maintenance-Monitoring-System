import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createVendor,
  deleteVendor,
  fetchVendors,
  fetchVendorsForDropdown,
  updateVendor,
} from '../api/vendors.api';
import type { VendorFormValues, VendorQueryParams } from '../types/vendor.types';

const VENDORS_KEY = 'vendors';

export function useVendors(params: VendorQueryParams) {
  return useQuery({
    queryKey: [VENDORS_KEY, 'list', params],
    queryFn: () => fetchVendors(params),
    placeholderData: (prev) => prev,
  });
}

export function useVendorsLookup() {
  return useQuery({
    queryKey: [VENDORS_KEY, 'dropdown'],
    queryFn: fetchVendorsForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VendorFormValues) => createVendor(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [VENDORS_KEY] }),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<VendorFormValues> }) => updateVendor(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [VENDORS_KEY] }),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [VENDORS_KEY] }),
  });
}
