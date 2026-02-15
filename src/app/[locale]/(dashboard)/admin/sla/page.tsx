"use client";

import { useTranslations } from "next-intl";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { typedResolver } from "@/lib/form-utils";
import {
  slaPolicyCreateSchema,
  type SlaPolicyCreateInput,
} from "@/lib/validations";
import {
  useSlaPolicies,
  useCreateSla,
  useUpdateSla,
  useDeleteSla,
} from "@/hooks/use-sla";
import type { Priority } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Shield } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlaPolicyRow {
  id: string;
  name: string;
  priority: Priority;
  responseTimeHours: number;
  resolveTimeHours: number;
  createdAt: string;
  updatedAt: string;
}

const ALL_PRIORITIES: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

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
// CreateSlaPolicyDialog
// ---------------------------------------------------------------------------

interface CreateSlaPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usedPriorities: Priority[];
}

function CreateSlaPolicyDialog({
  open,
  onOpenChange,
  usedPriorities,
}: CreateSlaPolicyDialogProps) {
  const createSla = useCreateSla();
  const t = useTranslations("admin.sla");
  const tc = useTranslations("common");

  const availablePriorities = useMemo(
    () => ALL_PRIORITIES.filter((p) => !usedPriorities.includes(p)),
    [usedPriorities],
  );

  const form = useForm<SlaPolicyCreateInput>({
    resolver: typedResolver(slaPolicyCreateSchema),
    defaultValues: {
      name: "",
      priority: availablePriorities[0] ?? "NORMAL",
      responseTimeHours: 1,
      resolveTimeHours: 8,
    },
  });

  // Reset defaults when dialog opens with fresh available priorities
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        priority: availablePriorities[0] ?? "NORMAL",
        responseTimeHours: 1,
        resolveTimeHours: 8,
      });
    }
  }, [open, availablePriorities, form]);

  async function onSubmit(data: SlaPolicyCreateInput) {
    try {
      await createSla.mutateAsync(data);
      toast.success("SLA policy created");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create SLA policy",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createSla")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Name *</Label>
            <Input id="create-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-priority">Priority *</Label>
            <Select
              value={form.watch("priority")}
              onValueChange={(val) =>
                form.setValue("priority", val as Priority)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {availablePriorities.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availablePriorities.length === 0 && (
              <p className="text-xs text-muted-foreground">
                All priorities already have SLA policies
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-responseTime">
                Response Time (hours) *
              </Label>
              <Input
                id="create-responseTime"
                type="number"
                min={1}
                {...form.register("responseTimeHours")}
              />
              {form.formState.errors.responseTimeHours && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.responseTimeHours.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-resolveTime">Resolve Time (hours) *</Label>
              <Input
                id="create-resolveTime"
                type="number"
                min={1}
                {...form.register("resolveTimeHours")}
              />
              {form.formState.errors.resolveTimeHours && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.resolveTimeHours.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSla.isPending || availablePriorities.length === 0}
            >
              {createSla.isPending ? "Creating..." : "Create Policy"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// EditSlaPolicyDialog
// ---------------------------------------------------------------------------

interface EditSlaPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: SlaPolicyRow;
  usedPriorities: Priority[];
}

function EditSlaPolicyDialog({
  open,
  onOpenChange,
  policy,
  usedPriorities,
}: EditSlaPolicyDialogProps) {
  const updateSla = useUpdateSla(policy.id);

  // For edit: show the current priority + any unused ones
  const availablePriorities = useMemo(
    () =>
      ALL_PRIORITIES.filter(
        (p) => p === policy.priority || !usedPriorities.includes(p),
      ),
    [usedPriorities, policy.priority],
  );

  const form = useForm<SlaPolicyCreateInput>({
    resolver: typedResolver(slaPolicyCreateSchema),
    defaultValues: {
      name: policy.name,
      priority: policy.priority,
      responseTimeHours: policy.responseTimeHours,
      resolveTimeHours: policy.resolveTimeHours,
    },
  });

  useEffect(() => {
    form.reset({
      name: policy.name,
      priority: policy.priority,
      responseTimeHours: policy.responseTimeHours,
      resolveTimeHours: policy.resolveTimeHours,
    });
  }, [policy, form]);

  async function onSubmit(data: SlaPolicyCreateInput) {
    try {
      await updateSla.mutateAsync(data);
      toast.success("SLA policy updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update SLA policy",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit SLA Policy</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input id="edit-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority *</Label>
            <Select
              value={form.watch("priority")}
              onValueChange={(val) =>
                form.setValue("priority", val as Priority)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {availablePriorities.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-responseTime">Response Time (hours) *</Label>
              <Input
                id="edit-responseTime"
                type="number"
                min={1}
                {...form.register("responseTimeHours")}
              />
              {form.formState.errors.responseTimeHours && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.responseTimeHours.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-resolveTime">Resolve Time (hours) *</Label>
              <Input
                id="edit-resolveTime"
                type="number"
                min={1}
                {...form.register("resolveTimeHours")}
              />
              {form.formState.errors.resolveTimeHours && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.resolveTimeHours.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateSla.isPending}>
              {updateSla.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// SlaPage
// ---------------------------------------------------------------------------

export default function SlaPage() {
  const t = useTranslations("admin.sla");
  const tc = useTranslations("common");
  const [showCreate, setShowCreate] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicyRow | null>(null);

  const { data: policies, isLoading } = useSlaPolicies();
  const deleteSla = useDeleteSla();

  const policyList = (policies || []) as SlaPolicyRow[];
  const usedPriorities = policyList.map((p) => p.priority);

  async function handleDelete(policy: SlaPolicyRow) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the SLA policy "${policy.name}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteSla.mutateAsync(policy.id);
      toast.success("SLA policy deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete SLA policy",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create SLA Policy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("description")}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : policyList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noSla")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("createFirst")}
                targets
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("priority")}</TableHead>
                  <TableHead>{t("responseTime")}</TableHead>
                  <TableHead>{t("resolveTime")}</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {policyList.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={priorityVariant[policy.priority]}
                        className="text-xs"
                      >
                        {policy.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{policy.responseTimeHours}</TableCell>
                    <TableCell>{policy.resolveTimeHours}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          title="Edit policy"
                          onClick={() => setEditingPolicy(policy)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete policy"
                          onClick={() => handleDelete(policy)}
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

      <CreateSlaPolicyDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        usedPriorities={usedPriorities}
      />

      {editingPolicy && (
        <EditSlaPolicyDialog
          open={!!editingPolicy}
          onOpenChange={(open) => {
            if (!open) setEditingPolicy(null);
          }}
          policy={editingPolicy}
          usedPriorities={usedPriorities}
        />
      )}
    </div>
  );
}
