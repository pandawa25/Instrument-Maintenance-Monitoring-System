import { api } from '@/lib/axios';
import type { PaginatedResult } from '@/lib/types';
import type { Vendor, VendorFormValues, VendorQueryParams } from '../types/vendor.types';

export async function fetchVendors(params: VendorQueryParams) {
  const { data } = await api.get<PaginatedResult<Vendor>>('/vendors', {
    params: { ...params, status: params.status || undefined },
  });
  return data;
}

export async function fetchVendorById(id: string) {
  const { data } = await api.get<{ data: Vendor }>(`/vendors/${id}`);
  return data.data;
}

export async function fetchVendorsForDropdown() {
  const { data } = await api.get<{ data: Vendor[] }>('/vendors/dropdown');
  return data.data;
}

export async function createVendor(payload: VendorFormValues) {
  const { data } = await api.post<{ data: Vendor }>('/vendors', payload);
  return data.data;
}

export async function updateVendor(id: string, payload: Partial<VendorFormValues>) {
  const { data } = await api.patch<{ data: Vendor }>(`/vendors/${id}`, payload);
  return data.data;
}

export async function deleteVendor(id: string) {
  await api.delete(`/vendors/${id}`);
}
