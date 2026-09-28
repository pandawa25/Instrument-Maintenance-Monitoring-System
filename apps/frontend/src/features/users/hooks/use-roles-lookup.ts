import { useQuery } from '@tanstack/react-query';
import { fetchRolesForDropdown } from '../api/roles-lookup.api';

export function useRolesLookup() {
  return useQuery({
    queryKey: ['roles-lookup'],
    queryFn: fetchRolesForDropdown,
    staleTime: 5 * 60 * 1000,
  });
}
