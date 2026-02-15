"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/shared/status-badge";
import type { KanbanTicket } from "@/hooks/use-kanban";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

interface KanbanCardProps {
  ticket: KanbanTicket;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function KanbanCard({ ticket }: KanbanCardProps) {
  const router = useRouter();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: {
      type: "ticket",
      ticket,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only navigate if we're not dragging
    if (!isDragging) {
      e.preventDefault();
      router.push(`/tickets/${ticket.id}`);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-pointer select-none gap-0 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/20"
      )}
      onClick={handleClick}
    >
      {/* Header: ticket number + drag handle */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-muted-foreground">
          #{String(ticket.ticketNumber).padStart(3, "0")}
        </span>
        <button
          className="touch-none rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Subject */}
      <p className="text-sm font-medium leading-snug line-clamp-2 mb-2">
        {ticket.subject}
      </p>

      {/* Footer: company, priority, assignee */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-muted-foreground truncate">
            {ticket.company.shortName}
          </span>
          <PriorityBadge priority={ticket.priority} />
        </div>

        {ticket.assignedTo && (
          <Avatar size="sm">
            <AvatarFallback className="text-[10px]">
              {getInitials(ticket.assignedTo.name)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </Card>
  );
}
