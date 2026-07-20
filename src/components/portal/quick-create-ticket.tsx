"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useCreatePortalTicket } from "@/hooks/use-portal";
import { Send, Paperclip, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Compact blok bovenaan het dashboard: direct een ticket aanvragen zonder eerst
// naar een aparte pagina te navigeren. Voor bijlagen/meer opties is er een link
// naar het volledige formulier.
export function QuickCreateTicket() {
  const t = useTranslations("portal");
  const tp = useTranslations("priority");
  const createTicket = useCreatePortalTicket();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;

    try {
      await createTicket.mutateAsync({
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
      });
      toast.success(t("quickCreateSuccess"));
      setSubject("");
      setDescription("");
      setPriority("NORMAL");
    } catch {
      toast.error(t("createError"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-5 w-5" />
          {t("quickCreateTitle")}
        </CardTitle>
        <CardDescription>{t("quickCreateDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-subject">{t("subject")}</Label>
            <Input
              id="quick-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("subjectPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-description">{t("description")}</Label>
            <Textarea
              id="quick-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 sm:w-[200px]">
              <Label>{t("priority")}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{tp("LOW")}</SelectItem>
                  <SelectItem value="NORMAL">{tp("NORMAL")}</SelectItem>
                  <SelectItem value="HIGH">{tp("HIGH")}</SelectItem>
                  <SelectItem value="URGENT">{tp("URGENT")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/portal/tickets/new"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {t("quickCreateMoreOptions")}
              </Link>
              <Button type="submit" disabled={createTicket.isPending}>
                <Send className="mr-1.5 h-4 w-4" />
                {createTicket.isPending ? t("creating") : t("quickCreateSubmit")}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
