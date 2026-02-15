"use client";

import { useTranslations } from "next-intl";
import { useTemplates } from "@/hooks/use-templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Priority, TicketCategory } from "@/generated/prisma/client";

export interface TemplateData {
  id: string;
  name: string;
  subject: string;
  body: string | null;
  priority: Priority;
  category: TicketCategory | null;
  tasksPerformed: string | null;
  pcName: string | null;
  serialNumber: string | null;
  officeLicense: string | null;
  pendingTasks: string | null;
  equipmentTaken: string | null;
}

interface TemplateSelectProps {
  onSelect: (template: TemplateData | null) => void;
}

export function TemplateSelect({ onSelect }: TemplateSelectProps) {
  const t = useTranslations("newTicket");
  const tc = useTranslations("common");
  const { data: templates, isLoading } = useTemplates();

  const templateList = (templates || []) as Array<{
    id: string;
    name: string;
    subject: string;
    priority: Priority;
    category: TicketCategory | null;
  }>;

  async function handleChange(value: string) {
    if (value === "none") {
      onSelect(null);
      return;
    }

    try {
      const res = await fetch(`/api/templates/${value}`);
      if (!res.ok) throw new Error("Failed to load template");
      const data: TemplateData = await res.json();
      onSelect(data);
    } catch {
      // silently fail – the user can still fill in fields manually
    }
  }

  return (
    <Select onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={isLoading ? tc("loading") : t("applyTemplate")}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        {templateList.map((tmpl) => (
          <SelectItem key={tmpl.id} value={tmpl.id}>
            {tmpl.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
