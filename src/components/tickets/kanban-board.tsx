"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  useKanbanTickets,
  useReorderKanban,
  type KanbanTicket,
  type KanbanColumns,
} from "@/hooks/use-kanban";
import { KanbanColumn } from "@/components/tickets/kanban-column";
import { KanbanCard } from "@/components/tickets/kanban-card";

const COLUMNS = [
  { status: "OPEN", title: "Open", color: "blue" },
  { status: "IN_PROGRESS", title: "In Progress", color: "yellow" },
  { status: "WAITING", title: "Waiting", color: "orange" },
  { status: "RESOLVED", title: "Resolved", color: "green" },
  { status: "BILLABLE", title: "Te factureren", color: "purple" },
] as const;

const EMPTY_COLUMNS: KanbanColumns = {
  OPEN: [],
  IN_PROGRESS: [],
  WAITING: [],
  RESOLVED: [],
  BILLABLE: [],
};

export function KanbanBoard() {
  const { data, isLoading } = useKanbanTickets();
  const reorderMutation = useReorderKanban();
  const [activeTicket, setActiveTicket] = useState<KanbanTicket | null>(null);
  const [localColumns, setLocalColumns] = useState<KanbanColumns | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  // Use local state during drag, otherwise use server data
  const columns = useMemo(() => {
    if (localColumns) return localColumns;
    return data?.columns ?? EMPTY_COLUMNS;
  }, [localColumns, data]);

  const findColumnByTicketId = useCallback(
    (ticketId: string): string | null => {
      for (const [status, tickets] of Object.entries(columns)) {
        if (tickets.some((t) => t.id === ticketId)) {
          return status;
        }
      }
      return null;
    },
    [columns],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const ticket = active.data.current?.ticket as KanbanTicket | undefined;
      if (ticket) {
        setActiveTicket(ticket);
        // Clone the columns to local state for in-flight drag updates
        setLocalColumns(
          JSON.parse(JSON.stringify(data?.columns ?? EMPTY_COLUMNS)),
        );
      }
    },
    [data],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !localColumns) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeColumn = findColumnByTicketId(activeId);

      // Determine the target column
      let overColumn: string | null = null;
      if (overId.startsWith("column-")) {
        overColumn = overId.replace("column-", "");
      } else {
        overColumn = findColumnByTicketId(overId);
      }

      if (!activeColumn || !overColumn || activeColumn === overColumn) return;

      // Move ticket from one column to another
      setLocalColumns((prev) => {
        if (!prev) return prev;

        const sourceTickets = [...prev[activeColumn]];
        const destTickets = [...prev[overColumn]];

        const activeIndex = sourceTickets.findIndex((t) => t.id === activeId);
        if (activeIndex === -1) return prev;

        const [movedTicket] = sourceTickets.splice(activeIndex, 1);
        const updatedTicket = { ...movedTicket, status: overColumn };

        // Find insertion index
        const overIndex = destTickets.findIndex((t) => t.id === overId);
        if (overIndex >= 0) {
          destTickets.splice(overIndex, 0, updatedTicket);
        } else {
          destTickets.push(updatedTicket);
        }

        return {
          ...prev,
          [activeColumn]: sourceTickets,
          [overColumn]: destTickets,
        };
      });
    },
    [localColumns, findColumnByTicketId],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTicket(null);

      if (!over || !localColumns) {
        setLocalColumns(null);
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeColumn = findColumnByTicketId(activeId);

      let overColumn: string | null = null;
      if (overId.startsWith("column-")) {
        overColumn = overId.replace("column-", "");
      } else {
        overColumn = findColumnByTicketId(overId);
      }

      if (!activeColumn || !overColumn) {
        setLocalColumns(null);
        return;
      }

      let updatedColumns = { ...localColumns };

      // Handle within-column reorder
      if (activeColumn === overColumn) {
        const columnTickets = [...localColumns[activeColumn]];
        const activeIndex = columnTickets.findIndex((t) => t.id === activeId);
        const overIndex = columnTickets.findIndex((t) => t.id === overId);

        if (
          activeIndex !== -1 &&
          overIndex !== -1 &&
          activeIndex !== overIndex
        ) {
          updatedColumns = {
            ...updatedColumns,
            [activeColumn]: arrayMove(columnTickets, activeIndex, overIndex),
          };
        }
      }

      // Calculate new kanbanOrder for all tickets in the target column
      const targetColumn = updatedColumns[overColumn] || [];
      const movedTicketIndex = targetColumn.findIndex((t) => t.id === activeId);
      const newOrder =
        movedTicketIndex >= 0 ? movedTicketIndex : targetColumn.length;

      // Build affected tickets (all other tickets in the target column that need reordering)
      const affectedTickets: { id: string; kanbanOrder: number }[] = [];
      targetColumn.forEach((ticket, index) => {
        if (ticket.id !== activeId) {
          affectedTickets.push({ id: ticket.id, kanbanOrder: index });
        }
      });

      // If the source column is different, also update source column orders
      if (activeColumn !== overColumn) {
        const sourceColumn = updatedColumns[activeColumn] || [];
        sourceColumn.forEach((ticket, index) => {
          affectedTickets.push({ id: ticket.id, kanbanOrder: index });
        });
      }

      // Clear local state and let optimistic update handle it
      setLocalColumns(null);

      // Fire the mutation
      reorderMutation.mutate({
        ticketId: activeId,
        newStatus: overColumn,
        newOrder,
        affectedTickets,
      });
    },
    [localColumns, findColumnByTicketId, reorderMutation],
  );

  const handleDragCancel = useCallback(() => {
    setActiveTicket(null);
    setLocalColumns(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col.status}
            className="min-w-[280px] w-[280px] shrink-0 rounded-xl border bg-muted/30 p-3"
          >
            <div className="h-6 w-24 bg-muted rounded animate-pulse mb-3" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            title={col.title}
            tickets={columns[col.status] || []}
            color={col.color}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="rotate-3 w-[264px]">
            <KanbanCard ticket={activeTicket} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
