"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications(unreadOnly = false) {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unreadOnly", "true");
  return useQuery<Notification[]>({
    queryKey: ["notifications", { unreadOnly }],
    queryFn: () => fetchJson(`/api/notifications?${params}`),
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: () => fetchJson("/api/notifications/unread-count"),
    refetchInterval: 15000, // Poll every 15s
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson("/api/notifications/read-all", { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}
