'use client';

import type { UserDTO } from '@dechub/shared';
import { useApi } from './useApi';

export function useUsers() {
  const { data, reload } = useApi<{ items: UserDTO[] }>('/users');
  const users = data?.items ?? [];
  return { users, activeUsers: users.filter((u) => u.status === 'active'), reload };
}
