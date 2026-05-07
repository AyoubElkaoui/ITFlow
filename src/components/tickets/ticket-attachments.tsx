"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Camera, Paperclip, X, FileText, Loader2, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Attachment {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface TicketAttachmentsProps {
  ticketId: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TicketAttachments({ ticketId }: TicketAttachmentsProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ["attachments", ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload mislukt" }));
        throw new Error(err.error || "Upload mislukt");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attachments", ticketId] });
      toast.success("Bijlage toegevoegd");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attachments", ticketId] });
      toast.success("Bijlage verwijderd");
    },
    onError: () => toast.error("Verwijderen mislukt"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  }

  const isImage = (mime: string) => mime.startsWith("image/");

  if (isLoading) {
    return <div className="h-8 bg-muted rounded animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      {/* Upload knoppen */}
      <div className="flex gap-2 flex-wrap">
        {/* Camera (mobiel) */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="md:hidden"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-1.5" />
          )}
          Foto maken
        </Button>

        {/* Bestand kiezen */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4 mr-1.5" />
          )}
          Bijlage toevoegen
        </Button>

        {/* Verborgen inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Bijlagenlijst */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="group relative rounded-lg border overflow-hidden bg-muted/30">
              {isImage(att.mimeType) ? (
                <>
                  <button
                    type="button"
                    onClick={() => setLightbox(att.url)}
                    className="block w-full aspect-square relative"
                  >
                    <Image
                      src={att.url}
                      alt={att.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                </>
              ) : (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center aspect-square gap-1 p-2 hover:bg-muted/60 transition-colors"
                >
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="text-[10px] text-center text-muted-foreground truncate w-full">
                    {att.name}
                  </span>
                </a>
              )}

              {/* Bestandsnaam & grootte */}
              <div className="px-1.5 py-1 bg-card/80">
                <p className="text-[10px] truncate text-muted-foreground">{att.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(att.size)}</p>
              </div>

              {/* Verwijder knop */}
              <button
                type="button"
                onClick={() => deleteMutation.mutate(att.id)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground hidden group-hover:flex items-center justify-center"
                disabled={deleteMutation.isPending}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <p className="text-xs text-muted-foreground">Nog geen bijlagen</p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={lightbox}
              alt="Bijlage"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </div>
  );
}
