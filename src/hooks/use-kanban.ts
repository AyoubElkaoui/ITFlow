"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface KanbanTicket {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  category: string | null;
  kanbanOrder: number | null;
  createdAt: string;
  company: { id: string; name: string; shortName: string };
  assignedTo: { id: string; name: string; avatar: string | null } | null;
  createdBy: { id: string; name: string };
}

export interface KanbanColumns {
  [status: string]: KanbanTicket[];
}

interface KanbanResponse {
  columns: KanbanColumns;
}

interface ReorderPayload {
  ticketId: string;
  newStatus: string;
  newOrder: number;
  affectedTickets: { id: string; kanbanOrder: number }[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export function useKanbanTickets() {
  return useQuery<KanbanResponse>({
    queryKey: ["kanban-tickets"],
    queryFn: () => fetchJson<KanbanResponse>("/api/tickets/kanban"),
  });
}

export function useReorderKanban() {
  const qc = useQueryClient();

  return useMutation<unknown, Error, ReorderPayload>({
    mutationFn: (payload: ReorderPayload) =>
      fetchJson("/api/tickets/kanban/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onMutate: async (payload) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ["kanban-tickets"] });

      // Snapshot the previous value
      const previous = qc.getQueryData<KanbanResponse>(["kanban-tickets"]);

      // Optimistically update the cache
      qc.setQueryData<KanbanResponse>(["kanban-tickets"], (old) => {
        if (!old) return old;

        const newColumns: KanbanColumns = {};

        // Deep clone the columns
        for (const [status, tickets] of Object.entries(old.columns)) {
          newColumns[status] = tickets.filter((t) => t.id !== payload.ticketId);
        }

        // Find the moved ticket from the original data
        let movedTicket: KanbanTicket | undefined;
        for (const tickets of Object.values(old.columns)) {
          movedTicket = tickets.find((t) => t.id === payload.ticketId);
          if (movedTicket) break;
        }

        if (movedTicket) {
          // Update the ticket with new status and order
          const updatedTicket: KanbanTicket = {
            ...movedTicket,
            status: payload.newStatus,
            kanbanOrder: payload.newOrder,
          };

          // Ensure the target column exists
          if (!newColumns[payload.newStatus]) {
            newColumns[payload.newStatus] = [];
          }

          // Insert at the correct position
          newColumns[payload.newStatus].push(updatedTicket);

          // Update affected tickets' kanbanOrder
          for (const affected of payload.affectedTickets) {
            for (const tickets of Object.values(newColumns)) {
              const ticket = tickets.find((t) => t.id === affected.id);
              if (ticket) {
                ticket.kanbanOrder = affected.kanbanOrder;
              }
            }
          }

          // Sort the target column by kanbanOrder
          newColumns[payload.newStatus].sort(
            (a, b) => (a.kanbanOrder ?? 0) - (b.kanbanOrder ?? 0)
          );
        }

        return { columns: newColumns };
      });

      return { previous };
    },
    onError: (_err, _payload, context) => {
      // Roll back on error
      const ctx = context as { previous?: KanbanResponse } | undefined;
      if (ctx?.previous) {
        qc.setQueryData(["kanban-tickets"], ctx.previous);
      }
    },
    onSettled: () => {
      // Refetch after mutation settles
      qc.invalidateQueries({ queryKey: ["kanban-tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
