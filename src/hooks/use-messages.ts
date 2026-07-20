"use client";

import { useQuery } from "@tanstack/react-query";

export interface Conversation {
  ticketId: string;
  ticketNumber: number;
  subject: string;
  status: string;
  companyName: string;
  contactName: string;
  lastMessage: string;
  lastMessageAt: string;
  lastFromClient: boolean;
  lastAuthorName: string;
}

export function useMessages() {
  return useQuery<Conversation[]>({
    queryKey: ["messages"],
    queryFn: async () => {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("Kon berichten niet laden");
      return res.json();
    },
    refetchInterval: 30000,
  });
}
