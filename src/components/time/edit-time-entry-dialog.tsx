"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useUpdateTimeEntry } from "@/hooks/use-time-entries";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CompanySelect } from "@/components/shared/company-select";
import { TicketSelect } from "@/components/shared/ticket-select";
import { TimeInput } from "@/components/ui/time-input";
import { toast } from "sonner";

interface TimeEntryData {
  id: string;
  date: string;
  hours: string;
  description: string | null;
  billable: boolean;
  company: { id: string; name: string; shortName: string };
  ticket: { id: string; ticketNumber: number; subject: string } | null;
  user: { id: string; name: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimeEntryData;
}

export function EditTimeEntryDialog({ open, onOpenChange, entry }: Props) {
  const t = useTranslations("time");
  const tc = useTranslations("common");
  const ttoast = useTranslations("toasts");

  const updateEntry = useUpdateTimeEntry(entry.id);

  const [date, setDate] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [hours, setHours] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);

  function addHoursToTime(time: string, h: number): string {
    if (!time) return "";
    const [hh, mm] = time.split(":").map(Number);
    const total = hh * 60 + mm + Math.round(h * 60);
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function timeDiffToHours(start: string, end: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    return diff <= 0 ? 0 : Math.round(diff / 15) * 0.25;
  }

  useEffect(() => {
    setDate(format(new Date(entry.date), "yyyy-MM-dd"));
    setCompanyId(entry.company.id);
    setTicketId(entry.ticket?.id ?? "");
    setHours(String(Number(entry.hours)));
    setStartTime("");
    setEndTime("");
    setDescription(entry.description ?? "");
    setBillable(entry.billable);
  }, [entry]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !hours || Number(hours) <= 0) return;

    try {
      await updateEntry.mutateAsync({
        companyId,
        ticketId: ticketId || null,
        date: new Date(date),
        hours: Number(hours),
        description: description || undefined,
        billable,
      });
      toast.success(ttoast("updated", { entity: "Time entry" }));
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : ttoast("failed", { action: "update", entity: "time entry" }),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editEntry")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{tc("date")}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{tc("company")}</Label>
            <CompanySelect
              value={companyId}
              onValueChange={setCompanyId}
              placeholder={tc("selectCompany")}
            />
          </div>

          {/* Tijd */}
          <div className="space-y-2">
            <Label>Tijd</Label>
            <div className="flex items-center gap-2">
              <TimeInput
                value={startTime}
                onChange={(s) => {
                  const h = parseFloat(hours) || 0;
                  const end = h > 0 ? addHoursToTime(s, h) : endTime;
                  setStartTime(s);
                  setEndTime(end);
                }}
                className="w-[100px]"
                placeholder="HH:MM"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <TimeInput
                value={endTime}
                onChange={(end) => {
                  const h = timeDiffToHours(startTime, end);
                  setEndTime(end);
                  if (h > 0) setHours(String(h));
                }}
                className="w-[100px]"
                placeholder="HH:MM"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tc("hours")}</Label>
              <Input
                type="number"
                step={0.25}
                min={0.25}
                max={24}
                value={hours}
                onChange={(e) => {
                  const h = e.target.value;
                  setHours(h);
                  if (startTime && parseFloat(h) > 0)
                    setEndTime(addHoursToTime(startTime, parseFloat(h)));
                }}
              />
              {parseFloat(hours) > 0 && startTime && endTime && (
                <p className="text-xs text-muted-foreground">
                  {startTime} → {endTime}
                </p>
              )}
            </div>
            <div className="space-y-2 flex items-end gap-2 pb-1">
              <Checkbox
                id="edit-billable"
                checked={billable}
                onCheckedChange={(v) => setBillable(v === true)}
              />
              <Label htmlFor="edit-billable">{tc("billable")}</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tc("description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("whatDidYouWorkOn")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("ticket")}</Label>
            <TicketSelect
              value={ticketId}
              onValueChange={(v) => setTicketId(v === "none" ? "" : v)}
              companyId={companyId || undefined}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={updateEntry.isPending}>
              {updateEntry.isPending ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
