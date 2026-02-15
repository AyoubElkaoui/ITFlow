"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface BulkActionPayload {
  ticketIds: string[];
  action: "updateStatus" | "updatePriority" | "assign" | "delete";
  value?: string;
}

interface BulkActionResponse {
  count: number;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function useBulkAction() {
  const qc = useQueryClient();
  return useMutation<BulkActionResponse, Error, BulkActionPayload>({
    mutationFn: (data) =>
      fetchJson<BulkActionResponse>("/api/tickets/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
