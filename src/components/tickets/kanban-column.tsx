"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "@/components/tickets/kanban-card";
import type { KanbanTicket } from "@/hooks/use-kanban";
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface KanbanColumnProps {
  status: string;
  title: string;
  tickets: KanbanTicket[];
  color: string;
}

const colorBorderMap: Record<string, string> = {
  blue: "border-t-blue-500",
  yellow: "border-t-yellow-500",
  orange: "border-t-orange-500",
  green: "border-t-green-500",
  gray: "border-t-gray-400",
};

const colorBgMap: Record<string, string> = {
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
  gray: "bg-gray-400",
};

export function KanbanColumn({ status, title, tickets, color }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: {
      type: "column",
      status,
    },
  });

  const ticketIds = tickets.map((t) => t.id);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-t-4 bg-muted/30 min-w-[280px] w-[280px] shrink-0",
        colorBorderMap[color] || "border-t-gray-400",
        isOver && "bg-muted/60 ring-2 ring-primary/20"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 py-3">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full shrink-0",
            colorBgMap[color] || "bg-gray-400"
          )}
        />
        <h3 className="text-sm font-semibold truncate">{title}</h3>
        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {tickets.length}
        </span>
      </div>

      {/* Ticket List */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[120px]"
      >
        <SortableContext items={ticketIds} strategy={verticalListSortingStrategy}>
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground/60">No tickets</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <KanbanCard key={ticket.id} ticket={ticket} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
