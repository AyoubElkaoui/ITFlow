"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCreatePortalTicket } from "@/hooks/use-portal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
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

export default function PortalNewTicketPage() {
  const t = useTranslations("portal");
  const tp = useTranslations("priority");
  const tc = useTranslations("category");
  const router = useRouter();
  const createTicket = useCreatePortalTicket();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [category, setCategory] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;

    try {
      await createTicket.mutateAsync({
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
        category: category || undefined,
      });
      router.push("/portal/tickets");
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("newTicket")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ticketDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t("subject")}</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("subjectPlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={5}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label>{t("category")}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HARDWARE">{tc("HARDWARE")}</SelectItem>
                    <SelectItem value="SOFTWARE">{tc("SOFTWARE")}</SelectItem>
                    <SelectItem value="NETWORK">{tc("NETWORK")}</SelectItem>
                    <SelectItem value="ACCOUNT">{tc("ACCOUNT")}</SelectItem>
                    <SelectItem value="OTHER">{tc("OTHER")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? t("creating") : t("createTicket")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/portal/tickets")}
              >
                {t("cancel")}
              </Button>
            </div>

            {createTicket.isError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {t("createError")}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
