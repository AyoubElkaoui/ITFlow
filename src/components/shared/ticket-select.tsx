"use client";

import { useTranslations } from "next-intl";
import { useTickets } from "@/hooks/use-tickets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TicketSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  companyId?: string;
  placeholder?: string;
}

interface TicketOption {
  id: string;
  ticketNumber: number;
  subject: string;
  company: { id: string; shortName: string };
}

export function TicketSelect({
  value,
  onValueChange,
  companyId,
  placeholder,
}: TicketSelectProps) {
  const tc = useTranslations("common");
  const { data } = useTickets({
    companyId,
    pageSize: 100,
    status: undefined,
  });

  const tickets = ((data as { data: TicketOption[] } | undefined)?.data ||
    []) as TicketOption[];

  return (
    <Select value={value || "none"} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || tc("selectTicket")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{tc("noTicket")}</SelectItem>
        {tickets.map((ticket) => (
          <SelectItem key={ticket.id} value={ticket.id}>
            <span className="font-mono text-muted-foreground">
              #{String(ticket.ticketNumber).padStart(3, "0")}
            </span>{" "}
            <span>{ticket.subject}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
