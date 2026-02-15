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

export interface TicketNote {
  id: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export function useTicketNotes(ticketId: string) {
  return useQuery<TicketNote[]>({
    queryKey: ["ticket-notes", ticketId],
    queryFn: () => fetchJson(`/api/tickets/${ticketId}/notes`),
    enabled: !!ticketId,
  });
}

export function useCreateNote(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; isInternal?: boolean }) =>
      fetchJson<TicketNote>(`/api/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-notes", ticketId] });
    },
  });
}

export function useUpdateNote(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      fetchJson<TicketNote>(`/api/tickets/${ticketId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-notes", ticketId] });
    },
  });
}

export function useDeleteNote(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      fetchJson(`/api/tickets/${ticketId}/notes/${noteId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket-notes", ticketId] });
    },
  });
}
