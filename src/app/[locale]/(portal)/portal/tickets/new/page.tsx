"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useCreatePortalTicket } from "@/hooks/use-portal";
import { Paperclip, X } from "lucide-react";

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
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 10 * 1024 * 1024;

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected).filter((f) => f.size <= MAX_SIZE);
    setFiles((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;

    try {
      const ticket = (await createTicket.mutateAsync({
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority,
        category: category || undefined,
      })) as { id: string };

      // Bijlagen uploaden nadat het ticket bestaat (heeft een id nodig).
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          await fetch(`/api/portal/tickets/${ticket.id}/attachments`, {
            method: "POST",
            body: fd,
          }).catch(() => {});
        }
        setUploading(false);
      }

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

            <div className="space-y-2">
              <Label>{t("attachments")}</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                {t("addFiles")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("attachmentsHint")}</p>

              {files.length > 0 && (
                <ul className="space-y-1.5 pt-1">
                  {files.map((file, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={t("removeFile")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={createTicket.isPending || uploading}
              >
                {createTicket.isPending || uploading
                  ? t("creating")
                  : t("createTicket")}
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
