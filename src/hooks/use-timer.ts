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

interface ActiveTimer {
  id: string;
  userId: string;
  ticketId: string | null;
  companyId: string;
  startedAt: string;
  description: string | null;
}

interface StartTimerInput {
  companyId: string;
  ticketId?: string;
  description?: string;
}

export function useActiveTimer() {
  return useQuery<ActiveTimer | null>({
    queryKey: ["active-timer"],
    queryFn: () => fetchJson<ActiveTimer | null>("/api/timer"),
    refetchInterval: 10000,
  });
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StartTimerInput) =>
      fetchJson<ActiveTimer>("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-timer"] });
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson("/api/timer/stop", {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-timer"] });
      qc.invalidateQueries({ queryKey: ["timeEntries"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDiscardTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson("/api/timer/discard", {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-timer"] });
    },
  });
}
