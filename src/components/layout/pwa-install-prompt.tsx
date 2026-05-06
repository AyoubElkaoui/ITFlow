"use client";

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Track visit count
    const visits = parseInt(localStorage.getItem("pwa-visits") ?? "0") + 1;
    localStorage.setItem("pwa-visits", String(visits));

    const dismissed = localStorage.getItem("pwa-dismissed");
    if (dismissed) return;
    if (visits < 2) return; // Show after 2+ visits

    // iOS detection
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    const isMobile = window.innerWidth < 768;

    if (isIos && isMobile) {
      setShowIos(true);
      return;
    }

    // Android / Chrome — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (isMobile) setShowAndroid(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-dismissed", "1");
    setShowAndroid(false);
    setShowIos(false);
  }

  async function installAndroid() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem("pwa-dismissed", "1");
    setShowAndroid(false);
    setDeferredPrompt(null);
  }

  if (!showAndroid && !showIos) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
      <div className="rounded-xl border border-border bg-card shadow-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              IT
            </div>
            <div>
              <p className="font-semibold text-sm">ITFlow installeren</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showIos
                  ? "Voeg toe aan beginscherm voor de beste ervaring"
                  : "Installeer als app op je telefoon"}
              </p>
            </div>
          </div>
          <button onClick={dismiss} className="text-muted-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {showIos && (
          <div className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <span>1.</span>
              <span>Tik op</span>
              <Share className="h-3.5 w-3.5 inline shrink-0" />
              <span className="font-medium">Delen</span>
              <span>onderaan Safari</span>
            </p>
            <p className="flex items-center gap-2">
              <span>2.</span>
              <Plus className="h-3.5 w-3.5 inline shrink-0" />
              <span>Tik op <strong>Zet op beginscherm</strong></span>
            </p>
          </div>
        )}

        {showAndroid && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={installAndroid} className="flex-1">
              Installeren
            </Button>
            <Button size="sm" variant="outline" onClick={dismiss}>
              Niet nu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
