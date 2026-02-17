"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBulkAction } from "@/hooks/use-bulk-tickets";
import {
  ChevronDown,
  X,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Trash2,
} from "lucide-react";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
  onSuccess: () => void;
}

interface UserOption {
  id: string;
  name: string;
}

const STATUS_VALUES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
  "BILLABLE",
] as const;
const PRIORITY_VALUES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export function BulkActionsBar({
  selectedIds,
  onClear,
  onSuccess,
}: BulkActionsBarProps) {
  const ts = useTranslations("status");
  const tp = useTranslations("priority");
  const tb = useTranslations("bulk");
  const tt = useTranslations("tickets");
  const tc = useTranslations("common");
  const bulkAction = useBulkAction();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  useEffect(() => {
    if (selectedIds.length > 0 && !usersLoaded) {
      fetch("/api/users")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch users");
          return res.json();
        })
        .then((data: UserOption[]) => {
          setUsers(data);
          setUsersLoaded(true);
        })
        .catch(() => {
          setUsersLoaded(true);
        });
    }
  }, [selectedIds.length, usersLoaded]);

  if (selectedIds.length === 0) {
    return null;
  }

  function handleStatusChange(status: string) {
    bulkAction.mutate(
      { ticketIds: selectedIds, action: "updateStatus", value: status },
      {
        onSuccess: (data) => {
          toast.success(`Updated status for ${data.count} ticket(s)`);
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update status");
        },
      },
    );
  }

  function handlePriorityChange(priority: string) {
    bulkAction.mutate(
      { ticketIds: selectedIds, action: "updatePriority", value: priority },
      {
        onSuccess: (data) => {
          toast.success(`Updated priority for ${data.count} ticket(s)`);
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update priority");
        },
      },
    );
  }

  function handleAssign(userId: string) {
    bulkAction.mutate(
      { ticketIds: selectedIds, action: "assign", value: userId },
      {
        onSuccess: (data) => {
          toast.success(`Assigned ${data.count} ticket(s)`);
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to assign tickets");
        },
      },
    );
  }

  function handleDelete() {
    const confirmed = window.confirm(
      tt("deleteConfirm", { count: selectedIds.length }),
    );
    if (!confirmed) return;

    bulkAction.mutate(
      { ticketIds: selectedIds, action: "delete" },
      {
        onSuccess: (data) => {
          toast.success(`Deleted ${data.count} ticket(s)`);
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to delete tickets");
        },
      },
    );
  }

  const isPending = bulkAction.isPending;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t bg-background/80 px-6 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] backdrop-blur-md rounded-t-xl">
      <span className="text-sm font-medium text-muted-foreground">
        {selectedIds.length} ticket{selectedIds.length !== 1 ? "s" : ""}{" "}
        {tt("selected")}
      </span>

      <div className="flex items-center gap-2">
        {/* Change Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              <RefreshCw className="size-3.5" />
              {tb("changeStatus")}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUS_VALUES.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => handleStatusChange(value)}
              >
                {ts(value)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Change Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              <AlertTriangle className="size-3.5" />
              {tb("changePriority")}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PRIORITY_VALUES.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => handlePriorityChange(value)}
              >
                {tp(value)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Assign */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              <UserCheck className="size-3.5" />
              {tb("assign")}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {users.length === 0 ? (
              <DropdownMenuItem disabled>
                {tb("noUsersAvailable")}
              </DropdownMenuItem>
            ) : (
              users.map((user) => (
                <DropdownMenuItem
                  key={user.id}
                  onSelect={() => handleAssign(user.id)}
                >
                  {user.name}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete */}
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
          {tc("delete")}
        </Button>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={isPending}
        >
          <X className="size-3.5" />
          {tb("clearSelection")}
        </Button>
      </div>
    </div>
  );
}
