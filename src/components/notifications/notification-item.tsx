"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Ticket,
  Users,
  Building2,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/hooks/use-notifications";

const typeIconMap: Record<string, React.ElementType> = {
  ticket: Ticket,
  user: Users,
  company: Building2,
  alert: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

function getNotificationIcon(type: string) {
  const Icon = typeIconMap[type.toLowerCase()] || Bell;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string, link?: string | null) => void;
}

export function NotificationItem({
  notification,
  onRead,
}: NotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  return (
    <button
      type="button"
      onClick={() => onRead(notification.id, notification.link)}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
        !notification.isRead && "bg-accent/50",
      )}
    >
      {/* Unread indicator */}
      <div className="mt-1.5 flex shrink-0 items-center">
        {!notification.isRead ? (
          <span className="h-2 w-2 rounded-full bg-blue-500" />
        ) : (
          <span className="h-2 w-2" />
        )}
      </div>

      {/* Type icon */}
      <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-tight",
            !notification.isRead ? "font-semibold" : "font-normal",
          )}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {notification.message}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </button>
  );
}
