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

interface PortalSession {
  contactName: string;
  companyName: string;
}

export function usePortalSession() {
  return useQuery({
    queryKey: ["portal-session"],
    queryFn: async (): Promise<PortalSession | null> => {
      // Bron van waarheid = de httpOnly-cookie, server-side uitgelezen.
      // Betrouwbaarder dan sessionStorage (dat bij het sluiten van de browser
      // verdwijnt terwijl de login-cookie 7 dagen blijft).
      const res = await fetch("/api/portal/session");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

interface PortalTicketFilters {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function usePortalTickets(filters: PortalTicketFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));

  return useQuery({
    queryKey: ["portal-tickets", filters],
    queryFn: () => fetchJson(`/api/portal/tickets?${params}`),
  });
}

export function usePortalTicket(id: string) {
  return useQuery({
    queryKey: ["portal-ticket", id],
    queryFn: () => fetchJson(`/api/portal/tickets/${id}`),
    enabled: !!id,
  });
}

export function usePortalTicketNotes(ticketId: string) {
  return useQuery({
    queryKey: ["portal-ticket-notes", ticketId],
    queryFn: () => fetchJson(`/api/portal/tickets/${ticketId}/notes`),
    enabled: !!ticketId,
  });
}

export function useCreatePortalTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      subject: string;
      description?: string;
      priority?: string;
      category?: string;
    }) =>
      fetchJson("/api/portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-tickets"] });
    },
  });
}

export function useCreatePortalNote(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      fetchJson(`/api/portal/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-ticket-notes", ticketId] });
    },
  });
}

// Messages / conversations
export interface PortalConversation {
  ticketId: string;
  ticketNumber: number;
  subject: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  lastFromClient: boolean;
  unreadCount: number;
}

export function usePortalMessages() {
  return useQuery<PortalConversation[]>({
    queryKey: ["portal-messages"],
    queryFn: () => fetchJson<PortalConversation[]>("/api/portal/messages"),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

// Totaal aantal ongelezen support-reacties (voor de balk-indicator).
export function usePortalUnreadCount() {
  const { data } = usePortalMessages();
  return (data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);
}

// Profile hooks
interface PortalProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  function: string | null;
  company: { name: string };
}

export function usePortalProfile() {
  return useQuery({
    queryKey: ["portal-profile"],
    queryFn: () => fetchJson<PortalProfile>("/api/portal/profile"),
  });
}

export function useUpdatePortalProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name?: string;
      email?: string;
      phone?: string;
      currentPassword?: string;
      newPassword?: string;
    }) =>
      fetchJson("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-profile"] });
    },
  });
}
