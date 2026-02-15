"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/use-notifications";
import { NotificationItem } from "@/components/notifications/notification-item";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: unreadData } = useUnreadCount();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = unreadData?.count ?? 0;
  const displayedNotifications = notifications?.slice(0, 20) ?? [];

  function handleRead(id: string, link?: string | null) {
    markAsRead.mutate(id);
    if (link) {
      setOpen(false);
      router.push(link);
    }
  }

  function handleMarkAllAsRead() {
    markAllAsRead.mutate();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading...
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <Bell className="h-8 w-8" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="py-1">
              {displayedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
