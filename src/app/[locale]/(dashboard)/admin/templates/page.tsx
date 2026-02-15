"use client";

import { useTranslations } from "next-intl";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  templateCreateSchema,
  type TemplateCreateInput,
} from "@/lib/validations";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "@/hooks/use-templates";
import type { Priority, TicketCategory } from "@/generated/prisma/client";
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
import { Plus, Pencil, Trash2, FileText } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemplateRow {
  id: string;
  name: string;
  subject: string;
  priority: Priority;
  category: TicketCategory | null;
  body: string | null;
  tasksPerformed: string | null;
  pcName: string | null;
  serialNumber: string | null;
  officeLicense: string | null;
  pendingTasks: string | null;
  equipmentTaken: string | null;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_OPTIONS: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const CATEGORY_OPTIONS: TicketCategory[] = [
  "HARDWARE",
  "SOFTWARE",
  "NETWORK",
  "ACCOUNT",
  "OTHER",
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

// ---------------------------------------------------------------------------
// CreateTemplateDialog
// ---------------------------------------------------------------------------

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateTemplateDialog({
  open,
  onOpenChange,
}: CreateTemplateDialogProps) {
  const createTemplate = useCreateTemplate();
  const t = useTranslations("admin.templates");
  const tc = useTranslations("common");
  const tp = useTranslations("priority");
  const tcat = useTranslations("category");
  const tt = useTranslations("tickets");

  const form = useForm<TemplateCreateInput>({
    resolver: typedResolver(templateCreateSchema),
    defaultValues: {
      name: "",
      subject: "",
      body: "",
      priority: "NORMAL",
      tasksPerformed: "",
      pcName: "",
      serialNumber: "",
      officeLicense: "",
      pendingTasks: "",
      equipmentTaken: "",
    },
  });

  async function onSubmit(data: TemplateCreateInput) {
    try {
      await createTemplate.mutateAsync(data);
      toast.success("Template created");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create template",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createTemplate")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">{t("name")} *</Label>
              <Input id="create-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-subject">{t("subject")} *</Label>
              <Input id="create-subject" {...form.register("subject")} />
              {form.formState.errors.subject && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.subject.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-priority">{t("priority")}</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(val) =>
                  form.setValue("priority", val as Priority)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tc("selectPriority")} />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tp(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-category">{t("category")}</Label>
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
                  <SelectValue placeholder={tc("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tcat(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-body">{t("body")}</Label>
            <Textarea id="create-body" rows={4} {...form.register("body")} />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">{t("itSnippet")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-pcName">{tt("pcName")}</Label>
                <Input id="create-pcName" {...form.register("pcName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-serialNumber">
                  {tt("serialNumber")}
                </Label>
                <Input
                  id="create-serialNumber"
                  {...form.register("serialNumber")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-officeLicense">
                  {tt("officeLicense")}
                </Label>
                <Input
                  id="create-officeLicense"
                  {...form.register("officeLicense")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-equipmentTaken">
                  {tt("equipmentTaken")}
                </Label>
                <Input
                  id="create-equipmentTaken"
                  {...form.register("equipmentTaken")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="create-tasksPerformed">
                  {tt("tasksPerformed")}
                </Label>
                <Textarea
                  id="create-tasksPerformed"
                  rows={3}
                  {...form.register("tasksPerformed")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-pendingTasks">
                  {tt("pendingTasks")}
                </Label>
                <Textarea
                  id="create-pendingTasks"
                  rows={3}
                  {...form.register("pendingTasks")}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={createTemplate.isPending}>
              {createTemplate.isPending ? tc("creating") : t("createTemplate")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// EditTemplateDialog
// ---------------------------------------------------------------------------

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateRow;
}

function EditTemplateDialog({
  open,
  onOpenChange,
  template,
}: EditTemplateDialogProps) {
  const updateTemplate = useUpdateTemplate(template.id);
  const t = useTranslations("admin.templates");
  const tc = useTranslations("common");
  const tp = useTranslations("priority");
  const tcat = useTranslations("category");
  const tt = useTranslations("tickets");

  const form = useForm<TemplateCreateInput>({
    resolver: typedResolver(templateCreateSchema),
    defaultValues: {
      name: template.name,
      subject: template.subject,
      body: template.body ?? "",
      priority: template.priority,
      category: template.category ?? undefined,
      tasksPerformed: template.tasksPerformed ?? "",
      pcName: template.pcName ?? "",
      serialNumber: template.serialNumber ?? "",
      officeLicense: template.officeLicense ?? "",
      pendingTasks: template.pendingTasks ?? "",
      equipmentTaken: template.equipmentTaken ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      name: template.name,
      subject: template.subject,
      body: template.body ?? "",
      priority: template.priority,
      category: template.category ?? undefined,
      tasksPerformed: template.tasksPerformed ?? "",
      pcName: template.pcName ?? "",
      serialNumber: template.serialNumber ?? "",
      officeLicense: template.officeLicense ?? "",
      pendingTasks: template.pendingTasks ?? "",
      equipmentTaken: template.equipmentTaken ?? "",
    });
  }, [template, form]);

  async function onSubmit(data: TemplateCreateInput) {
    try {
      await updateTemplate.mutateAsync(data);
      toast.success("Template updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update template",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editTemplate")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("name")} *</Label>
              <Input id="edit-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subject">{t("subject")} *</Label>
              <Input id="edit-subject" {...form.register("subject")} />
              {form.formState.errors.subject && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.subject.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-priority">{t("priority")}</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(val) =>
                  form.setValue("priority", val as Priority)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={tc("selectPriority")} />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tp(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">{t("category")}</Label>
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
                  <SelectValue placeholder={tc("selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc("none")}</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tcat(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-body">{t("body")}</Label>
            <Textarea id="edit-body" rows={4} {...form.register("body")} />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">{t("itSnippet")}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pcName">{tt("pcName")}</Label>
                <Input id="edit-pcName" {...form.register("pcName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-serialNumber">{tt("serialNumber")}</Label>
                <Input
                  id="edit-serialNumber"
                  {...form.register("serialNumber")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-officeLicense">
                  {tt("officeLicense")}
                </Label>
                <Input
                  id="edit-officeLicense"
                  {...form.register("officeLicense")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-equipmentTaken">
                  {tt("equipmentTaken")}
                </Label>
                <Input
                  id="edit-equipmentTaken"
                  {...form.register("equipmentTaken")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tasksPerformed">
                  {tt("tasksPerformed")}
                </Label>
                <Textarea
                  id="edit-tasksPerformed"
                  rows={3}
                  {...form.register("tasksPerformed")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pendingTasks">{tt("pendingTasks")}</Label>
                <Textarea
                  id="edit-pendingTasks"
                  rows={3}
                  {...form.register("pendingTasks")}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={updateTemplate.isPending}>
              {updateTemplate.isPending ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// TemplatesPage
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const t = useTranslations("admin.templates");
  const tc = useTranslations("common");
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | null>(
    null,
  );

  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  const templateList = (templates || []) as TemplateRow[];

  async function handleDelete(template: TemplateRow) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${template.name}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteTemplate.mutateAsync(template.id);
      toast.success("Template deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete template",
      );
    }
  }

  async function handleEdit(template: TemplateRow) {
    // If the row only has summary fields, fetch the full template
    if (template.body === undefined) {
      try {
        const res = await fetch(`/api/templates/${template.id}`);
        if (!res.ok) throw new Error("Failed to load template");
        const full: TemplateRow = await res.json();
        setEditingTemplate(full);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load template",
        );
      }
    } else {
      setEditingTemplate(template);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("createTemplate")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
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
          ) : templateList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noTemplates")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("createFirst")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("subject")}</TableHead>
                  <TableHead>{t("priority")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("created")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateList.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.subject}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={priorityVariant[template.priority]}
                        className="text-xs"
                      >
                        {template.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {template.category ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Edit template"
                          onClick={() => handleEdit(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete template"
                          onClick={() => handleDelete(template)}
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

      <CreateTemplateDialog open={showCreate} onOpenChange={setShowCreate} />

      {editingTemplate && (
        <EditTemplateDialog
          open={!!editingTemplate}
          onOpenChange={(open) => {
            if (!open) setEditingTemplate(null);
          }}
          template={editingTemplate}
        />
      )}
    </div>
  );
}
