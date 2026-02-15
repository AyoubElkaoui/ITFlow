"use client";

import { useTranslations } from "next-intl";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  recurringTicketCreateSchema,
  type RecurringTicketCreateInput,
} from "@/lib/validations";
import {
  useRecurringTickets,
  useCreateRecurring,
  useUpdateRecurring,
  useDeleteRecurring,
  useProcessRecurring,
} from "@/hooks/use-recurring";
import type {
  Priority,
  TicketCategory,
  RecurringFrequency,
} from "@/generated/prisma/client";
import { CompanySelect } from "@/components/shared/company-select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CalendarClock,
  Play,
} from "lucide-react";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecurringRow {
  id: string;
  companyId: string;
  subject: string;
  description: string | null;
  priority: Priority;
  category: TicketCategory | null;
  frequency: RecurringFrequency;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  nextRunAt: string;
  lastRunAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string; shortName: string };
}

const PRIORITY_OPTIONS: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const CATEGORY_OPTIONS: TicketCategory[] = [
  "HARDWARE",
  "SOFTWARE",
  "NETWORK",
  "ACCOUNT",
  "OTHER",
];
const FREQUENCY_OPTIONS: RecurringFrequency[] = [
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
];

const priorityVariant: Record<
  Priority,
  "default" | "secondary" | "destructive" | "outline"
> = {
  LOW: "secondary",
  NORMAL: "default",
  HIGH: "outline",
  URGENT: "destructive",
};

const frequencyLabel: Record<RecurringFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

// ---------------------------------------------------------------------------
// CreateRecurringDialog
// ---------------------------------------------------------------------------

interface CreateRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateRecurringDialog({
  open,
  onOpenChange,
}: CreateRecurringDialogProps) {
  const createRecurring = useCreateRecurring();

  const form = useForm<RecurringTicketCreateInput>({
    resolver: typedResolver(recurringTicketCreateSchema),
    defaultValues: {
      companyId: "",
      subject: "",
      description: "",
      priority: "NORMAL",
      frequency: "MONTHLY",
      nextRunAt: new Date(),
      isActive: true,
    },
  });

  const watchFrequency = form.watch("frequency");

  async function onSubmit(data: RecurringTicketCreateInput) {
    try {
      await createRecurring.mutateAsync(data);
      toast.success("Recurring ticket created");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create recurring ticket",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recurring Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Company *</Label>
            <CompanySelect
              value={form.watch("companyId")}
              onValueChange={(val) => form.setValue("companyId", val)}
            />
            {form.formState.errors.companyId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.companyId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-subject">Subject *</Label>
            <Input id="create-subject" {...form.register("subject")} />
            {form.formState.errors.subject && (
              <p className="text-xs text-destructive">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-description">Description</Label>
            <Textarea
              id="create-description"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(val) =>
                  form.setValue("priority", val as Priority)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch("category") ?? "none"}
                onValueChange={(val) =>
                  form.setValue(
                    "category",
                    val === "none" ? undefined : (val as TicketCategory),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select
                value={form.watch("frequency")}
                onValueChange={(val) =>
                  form.setValue("frequency", val as RecurringFrequency)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {frequencyLabel[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-nextRunAt">Next Run *</Label>
              <Input
                id="create-nextRunAt"
                type="datetime-local"
                {...form.register("nextRunAt")}
              />
              {form.formState.errors.nextRunAt && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.nextRunAt.message}
                </p>
              )}
            </div>
          </div>

          {(watchFrequency === "WEEKLY" || watchFrequency === "BIWEEKLY") && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={String(form.watch("dayOfWeek") ?? "")}
                onValueChange={(val) =>
                  form.setValue(
                    "dayOfWeek",
                    val === "" ? undefined : parseInt(val),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((day, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(watchFrequency === "MONTHLY" ||
            watchFrequency === "QUARTERLY" ||
            watchFrequency === "YEARLY") && (
            <div className="space-y-2">
              <Label htmlFor="create-dayOfMonth">Day of Month</Label>
              <Input
                id="create-dayOfMonth"
                type="number"
                min={1}
                max={31}
                {...form.register("dayOfMonth")}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRecurring.isPending}>
              {createRecurring.isPending
                ? "Creating..."
                : "Create Recurring Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// EditRecurringDialog
// ---------------------------------------------------------------------------

interface EditRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring: RecurringRow;
}

function EditRecurringDialog({
  open,
  onOpenChange,
  recurring,
}: EditRecurringDialogProps) {
  const updateRecurring = useUpdateRecurring(recurring.id);

  const form = useForm<RecurringTicketCreateInput>({
    resolver: typedResolver(recurringTicketCreateSchema),
    defaultValues: {
      companyId: recurring.companyId,
      subject: recurring.subject,
      description: recurring.description ?? "",
      priority: recurring.priority,
      category: recurring.category ?? undefined,
      frequency: recurring.frequency,
      dayOfWeek: recurring.dayOfWeek ?? undefined,
      dayOfMonth: recurring.dayOfMonth ?? undefined,
      nextRunAt: new Date(recurring.nextRunAt),
      isActive: recurring.isActive,
    },
  });

  const watchFrequency = form.watch("frequency");

  useEffect(() => {
    form.reset({
      companyId: recurring.companyId,
      subject: recurring.subject,
      description: recurring.description ?? "",
      priority: recurring.priority,
      category: recurring.category ?? undefined,
      frequency: recurring.frequency,
      dayOfWeek: recurring.dayOfWeek ?? undefined,
      dayOfMonth: recurring.dayOfMonth ?? undefined,
      nextRunAt: new Date(recurring.nextRunAt),
      isActive: recurring.isActive,
    });
  }, [recurring, form]);

  async function onSubmit(data: RecurringTicketCreateInput) {
    try {
      await updateRecurring.mutateAsync(data);
      toast.success("Recurring ticket updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update recurring ticket",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recurring Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Company *</Label>
            <CompanySelect
              value={form.watch("companyId")}
              onValueChange={(val) => form.setValue("companyId", val)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-subject">Subject *</Label>
            <Input id="edit-subject" {...form.register("subject")} />
            {form.formState.errors.subject && (
              <p className="text-xs text-destructive">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(val) =>
                  form.setValue("priority", val as Priority)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch("category") ?? "none"}
                onValueChange={(val) =>
                  form.setValue(
                    "category",
                    val === "none" ? undefined : (val as TicketCategory),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select
                value={form.watch("frequency")}
                onValueChange={(val) =>
                  form.setValue("frequency", val as RecurringFrequency)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {frequencyLabel[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nextRunAt">Next Run *</Label>
              <Input
                id="edit-nextRunAt"
                type="datetime-local"
                defaultValue={format(
                  new Date(recurring.nextRunAt),
                  "yyyy-MM-dd'T'HH:mm",
                )}
                onChange={(e) =>
                  form.setValue("nextRunAt", new Date(e.target.value))
                }
              />
            </div>
          </div>

          {(watchFrequency === "WEEKLY" || watchFrequency === "BIWEEKLY") && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={String(form.watch("dayOfWeek") ?? "")}
                onValueChange={(val) =>
                  form.setValue(
                    "dayOfWeek",
                    val === "" ? undefined : parseInt(val),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((day, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(watchFrequency === "MONTHLY" ||
            watchFrequency === "QUARTERLY" ||
            watchFrequency === "YEARLY") && (
            <div className="space-y-2">
              <Label htmlFor="edit-dayOfMonth">Day of Month</Label>
              <Input
                id="edit-dayOfMonth"
                type="number"
                min={1}
                max={31}
                {...form.register("dayOfMonth")}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateRecurring.isPending}>
              {updateRecurring.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// RecurringPage
// ---------------------------------------------------------------------------

export default function RecurringPage() {
  const t = useTranslations("admin.recurring");
  const tc = useTranslations("common");
  const [showCreate, setShowCreate] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringRow | null>(
    null,
  );

  const { data: recurringTickets, isLoading } = useRecurringTickets();
  const deleteRecurring = useDeleteRecurring();
  const processRecurring = useProcessRecurring();

  const recurringList = (recurringTickets || []) as RecurringRow[];

  async function handleDelete(recurring: RecurringRow) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the recurring ticket "${recurring.subject}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteRecurring.mutateAsync(recurring.id);
      toast.success("Recurring ticket deleted");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete recurring ticket",
      );
    }
  }

  async function handleProcess() {
    try {
      const result = (await processRecurring.mutateAsync()) as {
        created: number;
      };
      toast.success(
        `Processing complete. ${result.created ?? 0} ticket(s) created.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to process recurring tickets",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleProcess}
            disabled={processRecurring.isPending}
          >
            <Play className="mr-2 h-4 w-4" />
            {processRecurring.isPending ? t("processing") : t("processNow")}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Recurring
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("description")}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : recurringList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noRecurring")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("createFirst")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("subject")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("frequency")}</TableHead>
                  <TableHead>{t("priority")}</TableHead>
                  <TableHead>{t("nextRun")}</TableHead>
                  <TableHead>{t("lastRun")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringList.map((recurring) => (
                  <TableRow key={recurring.id}>
                    <TableCell className="font-medium">
                      {recurring.subject}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {recurring.company?.shortName || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {frequencyLabel[recurring.frequency]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={priorityVariant[recurring.priority]}
                        className="text-xs"
                      >
                        {recurring.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(
                        new Date(recurring.nextRunAt),
                        "dd MMM yyyy HH:mm",
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {recurring.lastRunAt
                        ? format(
                            new Date(recurring.lastRunAt),
                            "dd MMM yyyy HH:mm",
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={recurring.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {recurring.isActive ? tc("active") : tc("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Edit"
                          onClick={() => setEditingRecurring(recurring)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete"
                          onClick={() => handleDelete(recurring)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateRecurringDialog open={showCreate} onOpenChange={setShowCreate} />

      {editingRecurring && (
        <EditRecurringDialog
          open={!!editingRecurring}
          onOpenChange={(open) => {
            if (!open) setEditingRecurring(null);
          }}
          recurring={editingRecurring}
        />
      )}
    </div>
  );
}
