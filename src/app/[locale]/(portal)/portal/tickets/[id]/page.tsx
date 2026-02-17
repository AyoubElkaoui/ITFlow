"use client";

import { useTranslations } from "next-intl";
import { useState, use } from "react";
import { Link } from "@/i18n/navigation";
import {
  usePortalTicket,
  usePortalTicketNotes,
  useCreatePortalNote,
} from "@/hooks/use-portal";
import { ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  WAITING: "secondary",
  RESOLVED: "outline",
  BILLABLE: "secondary",
  CLOSED: "outline",
};

export default function PortalTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("portal");
  const ts = useTranslations("status");
  const tp = useTranslations("priority");

  const { data: ticket, isLoading } = usePortalTicket(id) as {
    data:
      | {
          id: string;
          ticketNumber: number;
          subject: string;
          description: string | null;
          status: string;
          priority: string;
          category: string | null;
          createdAt: string;
          updatedAt: string;
          resolvedAt: string | null;
          closedAt: string | null;
          contact: { name: string } | null;
          assignedTo: { name: string } | null;
        }
      | undefined;
    isLoading: boolean;
  };

  const { data: notes } = usePortalTicketNotes(id) as {
    data:
      | Array<{
          id: string;
          content: string;
          createdAt: string;
          user: { name: string };
        }>
      | undefined;
  };

  const createNote = useCreatePortalNote(id);
  const [message, setMessage] = useState("");

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await createNote.mutateAsync(message.trim());
      setMessage("");
    } catch {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        {t("loading")}
      </p>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("ticketNotFound")}</p>
        <Link href="/portal/tickets">
          <Button variant="link" className="mt-2">
            {t("backToTickets")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/portal/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("backToTickets")}
          </Button>
        </Link>
      </div>

      {/* Ticket info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                #{ticket.ticketNumber}
              </p>
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            </div>
            <Badge variant={statusVariant[ticket.status] || "outline"}>
              {ts(
                ticket.status as
                  | "OPEN"
                  | "IN_PROGRESS"
                  | "WAITING"
                  | "RESOLVED"
                  | "CLOSED",
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {t("description")}
              </p>
              <p className="text-sm whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">{t("priority")}</p>
              <p className="text-sm font-medium">
                {tp(ticket.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT")}
              </p>
            </div>
            {ticket.category && (
              <div>
                <p className="text-xs text-muted-foreground">{t("category")}</p>
                <p className="text-sm font-medium">{ticket.category}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">{t("created")}</p>
              <p className="text-sm">
                {format(new Date(ticket.createdAt), "d MMM yyyy HH:mm", {
                  locale: nl,
                })}
              </p>
            </div>
            {ticket.assignedTo && (
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("assignedTo")}
                </p>
                <p className="text-sm">{ticket.assignedTo.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("messages")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!notes || notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noMessages")}
            </p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {note.user.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.createdAt), "d MMM yyyy HH:mm", {
                        locale: nl,
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="flex gap-2 pt-2 border-t"
          >
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("writeMessage")}
              rows={2}
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={createNote.isPending || !message.trim()}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
