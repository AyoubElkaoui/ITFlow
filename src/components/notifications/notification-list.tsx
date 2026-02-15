"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotifications, useMarkAsRead } from "@/hooks/use-notifications";
import { NotificationItem } from "@/components/notifications/notification-item";

export function NotificationList() {
  const router = useRouter();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  function handleRead(id: string, link?: string | null) {
    markAsRead.mutate(id);
    if (link) {
      router.push(link);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading notifications...
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
        <Bell className="h-8 w-8" />
        <p className="text-sm">No notifications</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRead={handleRead}
        />
      ))}
    </div>
  );
}
