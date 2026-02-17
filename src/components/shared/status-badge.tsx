"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  OPEN: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  WAITING: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  RESOLVED: "bg-green-500/15 text-green-400 border-green-500/30",
  CLOSED: "bg-muted text-muted-foreground border-border",
  BILLABLE: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  NORMAL: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  URGENT: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("status");
  const className = statusStyles[status] || "";
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", className)}>
      {t(status as any)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const t = useTranslations("priority");
  const className = priorityStyles[priority] || "";
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", className)}>
      {t(priority as any)}
    </Badge>
  );
}
