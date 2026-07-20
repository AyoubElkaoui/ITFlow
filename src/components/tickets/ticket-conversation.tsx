"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { useTicketNotes, useCreateNote } from "@/hooks/use-ticket-notes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

// Herbruikbare klant-conversatie (niet-interne notities) met reageer-vak. Wordt
// gebruikt op de Berichten-pagina én in de ticketpagina, zodat je op beide
// plekken met de klant kunt berichten met dezelfde ervaring. Een reactie is een
// niet-interne notitie: zichtbaar voor de klant in het portaal (+ e-mail).
export function TicketConversation({
  ticketId,
  contactName,
  className,
  messagesClassName,
}: {
  ticketId: string;
  contactName?: string;
  className?: string;
  messagesClassName?: string;
}) {
  const t = useTranslations("messages");
  const { data: allNotes, isLoading } = useTicketNotes(ticketId);
  const createNote = useCreateNote(ticketId);
  const [reply, setReply] = useState("");

  // Alleen de klant-conversatie (niet-interne notities), oud -> nieuw.
  const messages = (allNotes ?? [])
    .filter((n) => !n.isInternal)
    .slice()
    .reverse();

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      await createNote.mutateAsync({ content: reply.trim(), isInternal: false });
      setReply("");
      toast.success(t("replySent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("replyFailed"));
    }
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        className={cn(
          "flex-1 space-y-3 overflow-y-auto",
          messagesClassName,
        )}
      >
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="ml-auto h-16 w-2/3" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("noMessages")}
          </p>
        ) : (
          messages.map((n) => {
            const fromClient = !!n.authorContact;
            return (
              <div
                key={n.id}
                className={cn(
                  "max-w-[85%] rounded-lg border p-3",
                  fromClient
                    ? "border-blue-200/60 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20"
                    : "ml-auto bg-primary/5 border-primary/20",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {fromClient
                      ? (n.authorContact?.name ?? contactName ?? "Klant")
                      : n.user.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                      locale: nl,
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{n.content}</p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="space-y-2 pt-3">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t("replyPlaceholder")}
          rows={2}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t("replyHint")}</p>
          <Button
            type="submit"
            size="sm"
            disabled={createNote.isPending || !reply.trim()}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {createNote.isPending ? t("sending") : t("sendReply")}
          </Button>
        </div>
      </form>
    </div>
  );
}
