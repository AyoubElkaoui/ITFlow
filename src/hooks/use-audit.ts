"use client";

import { useQuery } from "@tanstack/react-query";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

interface AuditFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function useAuditLogs(filters: AuditFilters = {}) {
  const params = new URLSearchParams();
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.entityId) params.set("entityId", filters.entityId);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return useQuery({
    queryKey: ["auditLogs", filters],
    queryFn: () => fetchJson(`/api/audit?${params}`),
  });
}

export function useActivityFeed(entityType?: string, entityId?: string) {
  const params = new URLSearchParams();
  if (entityType) params.set("entityType", entityType);
  if (entityId) params.set("entityId", entityId);
  params.set("pageSize", "20");

  return useQuery({
    queryKey: ["activity", entityType, entityId],
    queryFn: () => fetchJson(`/api/activity?${params}`),
  });
}
