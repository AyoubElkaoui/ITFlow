"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { typedResolver } from "@/lib/form-utils";
import { useCreateNote } from "@/hooks/use-ticket-notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const noteFormSchema = z.object({
  content: z.string().min(1, "Content is required"),
  isInternal: z.boolean().default(true),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NoteFormProps {
  ticketId: string;
  onSuccess?: () => void;
}

export function NoteForm({ ticketId, onSuccess }: NoteFormProps) {
  const t = useTranslations("ticketNotes");
  const createNote = useCreateNote(ticketId);

  const form = useForm<NoteFormValues>({
    resolver: typedResolver(noteFormSchema),
    defaultValues: {
      content: "",
      isInternal: true,
    },
  });

  async function onSubmit(data: NoteFormValues) {
    try {
      await createNote.mutateAsync(data);
      toast.success(t("addNote"));
      form.reset();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-2">
        <Textarea
          placeholder={t("writeNote")}
          rows={3}
          {...form.register("content")}
        />
        {form.formState.errors.content && (
          <p className="text-xs text-destructive">
            {form.formState.errors.content.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="isInternal"
              checked={form.watch("isInternal")}
              onCheckedChange={(checked) =>
                form.setValue("isInternal", checked === true)
              }
            />
            <Label htmlFor="isInternal" className="text-sm font-normal">
              {t("internalNote")}
            </Label>
          </div>

          <Button type="submit" size="sm" disabled={createNote.isPending}>
            {createNote.isPending
              ? t("adding")
              : form.watch("isInternal")
                ? t("addNote")
                : t("sendReply")}
          </Button>
        </div>
        <p
          className={cn(
            "text-xs",
            form.watch("isInternal")
              ? "text-muted-foreground"
              : "text-blue-600 dark:text-blue-400",
          )}
        >
          {form.watch("isInternal") ? t("internalHint") : t("customerHint")}
        </p>
      </div>
    </form>
  );
}
