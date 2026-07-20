"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePortalMessages } from "@/hooks/use-portal";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function PortalMessagesPage() {
  const t = useTranslations("portalMessages");
  const tc = useTranslations("common");

  const { data: conversations, isLoading } = usePortalMessages();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {tc("loading")}
            </p>
          ) : !conversations || conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <ul className="divide-y">
              {conversations.map((c) => (
                <li key={c.ticketId}>
                  <Link
                    href={`/portal/tickets/${c.ticketId}`}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={
                            c.unreadCount > 0
                              ? "truncate font-semibold"
                              : "truncate font-medium"
                          }
                        >
                          {c.subject}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.lastMessageAt), {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm text-muted-foreground">
                          {c.lastFromClient ? `${t("you")}: ` : ""}
                          {c.lastMessage}
                        </p>
                        {c.unreadCount > 0 && (
                          <Badge className="ml-auto h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 text-xs">
                            {c.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        #{c.ticketNumber}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
