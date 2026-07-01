"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TicketTimeLogCreateInput } from "@/lib/validations";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export interface TicketTimeLog {
  id: string;
  ticketId: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  minutes: number | null;
  note: string | null;
  user: { id: string; name: string };
}

export function useTicketTimeLogs(ticketId: string) {
  return useQuery<TicketTimeLog[]>({
    queryKey: ["ticket-time-logs", ticketId],
    queryFn: () => fetchJson(`/api/tickets/${ticketId}/time-logs`),
    enabled: !!ticketId,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, ticketId: string) {
  qc.invalidateQueries({ queryKey: ["ticket-time-logs", ticketId] });
  qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
  qc.invalidateQueries({ queryKey: ["tickets"] });
  qc.invalidateQueries({ queryKey: ["workday"] });
}

// Start een lopende log (stopt automatisch mijn andere lopende log) + zet ticket op IN_PROGRESS.
export function useStartWork(ticketId: string) {
  const qc = useQueryClient();
  return useMutation<TicketTimeLog, Error, void>({
    mutationFn: () =>
      fetchJson(`/api/tickets/${ticketId}/time-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "start" }),
      }),
    onSuccess: () => invalidate(qc, ticketId),
  });
}

// Stop een lopende log.
export function useStopWork(ticketId: string) {
  const qc = useQueryClient();
  return useMutation<TicketTimeLog, Error, string>({
    mutationFn: (logId) =>
      fetchJson(`/api/tickets/${ticketId}/time-logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stop: true }),
      }),
    onSuccess: () => invalidate(qc, ticketId),
  });
}

// Handmatige log (telefoon/online achteraf).
export function useAddManualLog(ticketId: string) {
  const qc = useQueryClient();
  return useMutation<TicketTimeLog, Error, TicketTimeLogCreateInput>({
    mutationFn: (data) =>
      fetchJson(`/api/tickets/${ticketId}/time-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, ticketId),
  });
}

export function useUpdateLog(ticketId: string) {
  const qc = useQueryClient();
  return useMutation<
    TicketTimeLog,
    Error,
    { logId: string; minutes?: number; note?: string | null; startedAt?: string }
  >({
    mutationFn: ({ logId, ...data }) =>
      fetchJson(`/api/tickets/${ticketId}/time-logs/${logId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidate(qc, ticketId),
  });
}

export function useDeleteLog(ticketId: string) {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (logId) =>
      fetchJson(`/api/tickets/${ticketId}/time-logs/${logId}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc, ticketId),
  });
}
