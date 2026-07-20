"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { typedResolver } from "@/lib/form-utils";
import { useCreateNote } from "@/hooks/use-ticket-notes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const noteFormSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

type NoteFormValues = z.infer<typeof noteFormSchema>;

interface NoteFormProps {
  ticketId: string;
  onSuccess?: () => void;
}

// Interne team-notities. Klant-communicatie loopt via de Berichten-tab
// (TicketConversation); dit formulier maakt daarom altijd een interne notitie.
export function NoteForm({ ticketId, onSuccess }: NoteFormProps) {
  const t = useTranslations("ticketNotes");
  const createNote = useCreateNote(ticketId);

  const form = useForm<NoteFormValues>({
    resolver: typedResolver(noteFormSchema),
    defaultValues: { content: "" },
  });

  async function onSubmit(data: NoteFormValues) {
    try {
      await createNote.mutateAsync({ content: data.content, isInternal: true });
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

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("internalHint")}</p>
        <Button type="submit" size="sm" disabled={createNote.isPending}>
          {createNote.isPending ? t("adding") : t("addNote")}
        </Button>
      </div>
    </form>
  );
}
