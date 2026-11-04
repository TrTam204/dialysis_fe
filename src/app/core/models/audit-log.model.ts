export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: number;
  actor: number | null;
  actor_name: string | null;
  actor_username?: string | null;
  actor_role: string | null;
  user_full_name?: string | null;
  username?: string | null;
  user_role?: string | null;
  action: AuditAction | string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, any>;
  timestamp: string;
}

export interface PaginatedAuditLogs {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLog[];
}

export interface AuditLogFilterParams {
  page?: number;
  page_size?: number;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  actor?: number;
  actor_username?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  ordering?: string;
}
