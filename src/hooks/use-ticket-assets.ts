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

interface AssetLink {
  id: string;
  assetId: string;
  ticketId: string;
  note: string | null;
  createdAt: string;
  asset: {
    id: string;
    type: string;
    brand: string | null;
    model: string | null;
    name: string | null;
    serialNumber: string | null;
    status: string;
    company: { shortName: string };
  };
}

export type { AssetLink };

export function useTicketAssets(ticketId: string) {
  return useQuery<AssetLink[]>({
    queryKey: ["ticket-assets", ticketId],
    queryFn: () => fetchJson(`/api/tickets/${ticketId}/assets`),
    enabled: !!ticketId,
  });
}

export function useLinkAsset(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { assetId: string; note?: string }) =>
      fetchJson(`/api/tickets/${ticketId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-assets", ticketId] });
    },
  });
}

export function useUnlinkAsset(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) =>
      fetchJson(`/api/tickets/${ticketId}/assets/${linkId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-assets", ticketId] });
    },
  });
}
