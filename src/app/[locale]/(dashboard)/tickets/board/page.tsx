"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/tickets/kanban-board";
import { List } from "lucide-react";

export default function TicketBoardPage() {
  const t = useTranslations("tickets");
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("ticketBoard")}</h1>
        <Link href="/tickets">
          <Button variant="outline">
            <List className="mr-2 h-4 w-4" />
            {t("listView")}
          </Button>
        </Link>
      </div>

      {/* Kanban Board */}
      <KanbanBoard />
    </div>
  );
}
