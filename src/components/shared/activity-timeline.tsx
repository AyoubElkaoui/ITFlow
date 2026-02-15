"use client";

import { useActivityFeed } from "@/hooks/use-audit";
import { formatDistanceToNow } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
  entityType?: string;
  entityId?: string;
}

interface ActivityEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  userId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const actionConfig: Record<
  string,
  {
    label: string;
    verb: string;
    icon: typeof Plus;
    className: string;
    badgeClassName: string;
  }
> = {
  CREATE: {
    label: "Created",
    verb: "created",
    icon: Plus,
    className: "bg-green-500/15 text-green-500 border-green-500/30",
    badgeClassName:
      "bg-green-500/15 text-green-400 border-green-500/30",
  },
  UPDATE: {
    label: "Updated",
    verb: "updated",
    icon: Pencil,
    className: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    badgeClassName:
      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  DELETE: {
    label: "Deleted",
    verb: "deleted",
    icon: Trash2,
    className: "bg-red-500/15 text-red-500 border-red-500/30",
    badgeClassName:
      "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ActivityTimeline({
  entityType,
  entityId,
}: ActivityTimelineProps) {
  const { data, isLoading } = useActivityFeed(entityType, entityId);
  const entries = (data as ActivityEntry[]) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, index) => {
        const config = actionConfig[entry.action] || actionConfig.UPDATE;
        const Icon = config.icon;
        const changes = entry.changes as Record<
          string,
          { old: unknown; new: unknown }
        > | null;

        return (
          <div key={entry.id}>
            <div className="flex gap-4 py-4">
              {/* Timeline icon */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                    config.className,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {index < entries.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Avatar size="sm">
                      <AvatarFallback>
                        {getInitials(entry.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {entry.user.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {config.verb}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", config.badgeClassName)}
                    >
                      {entry.entityType}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(entry.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>

                {/* Changes for UPDATE actions */}
                {entry.action === "UPDATE" && changes && (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                    {Object.entries(changes).map(([field, change]) => (
                      <div key={field} className="flex items-start gap-1">
                        <span className="font-medium text-muted-foreground">
                          {field}:
                        </span>
                        <span className="text-red-400 line-through">
                          {formatValue(change.old)}
                        </span>
                        <span className="text-muted-foreground mx-1">
                          &rarr;
                        </span>
                        <span className="text-green-400">
                          {formatValue(change.new)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Separator between entries */}
            {index < entries.length - 1 && <Separator />}
          </div>
        );
      })}
    </div>
  );
}
