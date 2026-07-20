"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import {
  useTicketNotes,
  useUpdateNote,
  useDeleteNote,
  type TicketNote,
} from "@/hooks/use-ticket-notes";
import { NoteForm } from "@/components/tickets/note-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TicketNotesProps {
  ticketId: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function NoteItem({
  note,
  ticketId,
  currentUserId,
}: {
  note: TicketNote;
  ticketId: string;
  currentUserId: string | undefined;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const updateNote = useUpdateNote(ticketId);
  const deleteNote = useDeleteNote(ticketId);

  // Notitie geschreven door een klant via het portaal (heeft voorrang op user).
  const isPortal = !!note.authorContact;
  const displayName = note.authorContact?.name ?? note.user.name;
  // Alleen eigen (staff-)notities zijn bewerkbaar; klant-notities niet.
  const isOwner = currentUserId === note.userId && !isPortal;

  async function handleSave() {
    if (!editContent.trim()) return;
    try {
      await updateNote.mutateAsync({
        noteId: note.id,
        content: editContent.trim(),
      });
      toast.success("Note updated");
      setIsEditing(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update note",
      );
    }
  }

  async function handleDelete() {
    try {
      await deleteNote.mutateAsync(note.id);
      toast.success("Note deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete note",
      );
    }
  }

  function handleCancel() {
    setEditContent(note.content);
    setIsEditing(false);
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        note.isInternal && "bg-amber-50/50 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40",
        isPortal && "bg-blue-50/50 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-900/40",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(note.createdAt), {
                addSuffix: true,
              })}
            </span>
            {isPortal && (
              <Badge
                variant="outline"
                className="text-xs bg-blue-100/80 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
              >
                Klant
              </Badge>
            )}
            {note.isInternal && !isPortal && (
              <Badge
                variant="outline"
                className="text-xs bg-amber-100/80 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
              >
                Intern
              </Badge>
            )}
          </div>
        </div>

        {isOwner && !isEditing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsEditing(true)}
              title="Edit note"
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleDelete}
              disabled={deleteNote.isPending}
              title="Delete note"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
          />
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="xs"
              onClick={handleCancel}
              disabled={updateNote.isPending}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              onClick={handleSave}
              disabled={updateNote.isPending || !editContent.trim()}
            >
              {updateNote.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm whitespace-pre-wrap">{note.content}</p>
      )}
    </div>
  );
}

export function TicketNotes({ ticketId }: TicketNotesProps) {
  const { data: session } = useSession();
  const { data: notes, isLoading } = useTicketNotes(ticketId);
  const currentUserId = session?.user?.id;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <NoteForm ticketId={ticketId} />

      <Separator />

      {!notes || notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              ticketId={ticketId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
