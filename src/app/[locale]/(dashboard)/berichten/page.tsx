"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, ExternalLink, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { useMessages, type Conversation } from "@/hooks/use-messages";
import { useTicketNotes, useCreateNote } from "@/hooks/use-ticket-notes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  t,
}: {
  conversations: Conversation[] | undefined;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (c: Conversation) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((c) => (
        <button
          key={c.ticketId}
          onClick={() => onSelect(c)}
          className={cn(
            "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-accent",
            selectedId === c.ticketId && "bg-accent",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">
              {c.contactName}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(c.lastMessageAt), {
                addSuffix: true,
                locale: nl,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">
              #{c.ticketNumber} · {c.companyName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="truncate text-sm text-muted-foreground">
              {c.lastFromClient ? "" : `${t("you")}: `}
              {c.lastMessage}
            </p>
            {c.lastFromClient && (
              <Badge
                variant="outline"
                className="ml-auto shrink-0 border-blue-300 bg-blue-100/80 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {t("awaitingReply")}
              </Badge>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function Thread({
  conversation,
  onBack,
  t,
}: {
  conversation: Conversation;
  onBack: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const { data: allNotes, isLoading } = useTicketNotes(conversation.ticketId);
  const createNote = useCreateNote(conversation.ticketId);
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onBack}
          aria-label={t("back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {conversation.contactName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {conversation.companyName}
          </p>
        </div>
        <Link
          href={`/tickets/${conversation.ticketId}`}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          #{conversation.ticketNumber}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Subject */}
      <div className="border-b bg-muted/30 px-4 py-2">
        <p className="truncate text-sm font-medium">{conversation.subject}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
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
                      ? (n.authorContact?.name ?? conversation.contactName)
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

      {/* Reply */}
      <form onSubmit={handleSend} className="space-y-2 border-t p-3">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={t("replyPlaceholder")}
          rows={2}
        />
        <div className="flex items-center justify-between">
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

export default function MessagesPage() {
  const t = useTranslations("messages");
  const { data: conversations, isLoading } = useMessages();
  const [selected, setSelected] = useState<Conversation | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid min-h-[60vh] md:grid-cols-[340px_1fr]">
          {/* Conversation list */}
          <div
            className={cn(
              "border-r md:block",
              selected ? "hidden" : "block",
            )}
          >
            <ConversationList
              conversations={conversations}
              isLoading={isLoading}
              selectedId={selected?.ticketId ?? null}
              onSelect={setSelected}
              t={t}
            />
          </div>

          {/* Thread */}
          <div className={cn("md:block", selected ? "block" : "hidden")}>
            {selected ? (
              <Thread
                conversation={selected}
                onBack={() => setSelected(null)}
                t={t}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">{t("selectConversation")}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
