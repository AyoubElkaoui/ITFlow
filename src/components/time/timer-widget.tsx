"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { Play, Square, Trash2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompanySelect } from "@/components/shared/company-select";
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
  useDiscardTimer,
} from "@/hooks/use-timer";

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TimerWidget() {
  const t = useTranslations("timer");
  const { data: timer, isLoading } = useActiveTimer();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const discardTimer = useDiscardTimer();

  const [elapsed, setElapsed] = useState(0);
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [description, setDescription] = useState("");

  const calcElapsed = useCallback(() => {
    if (!timer?.startedAt) return 0;
    return Math.floor(
      (Date.now() - new Date(timer.startedAt).getTime()) / 1000,
    );
  }, [timer?.startedAt]);

  useEffect(() => {
    if (!timer) {
      setElapsed(0);
      return;
    }
    setElapsed(calcElapsed());
    const interval = setInterval(() => {
      setElapsed(calcElapsed());
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, calcElapsed]);

  const handleStart = () => {
    if (!companyId) return;
    startTimer.mutate(
      {
        companyId,
        ticketId: ticketId || undefined,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setCompanyId("");
          setTicketId("");
          setDescription("");
        },
      },
    );
  };

  const handleStop = () => {
    stopTimer.mutate();
  };

  const handleDiscard = () => {
    discardTimer.mutate();
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="size-4 animate-spin" />
      </Button>
    );
  }

  if (timer) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 rounded-md bg-green-500/10 px-2 py-1 text-sm font-mono text-green-600 dark:text-green-400">
          <Clock className="size-3.5" />
          <span>{formatElapsed(elapsed)}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleStop}
                disabled={stopTimer.isPending}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
              >
                {stopTimer.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Square className="size-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("stopAndSave")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleDiscard}
                disabled={discardTimer.isPending}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                {discardTimer.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("discardTimer")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Play className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("startTimer")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-3">
          <h4 className="font-medium text-sm">{t("startTimer")}</h4>
          <div className="grid gap-2">
            <Label htmlFor="timer-company">{t("company")} *</Label>
            <CompanySelect value={companyId} onValueChange={setCompanyId} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timer-ticket">{t("ticketId")}</Label>
            <Input
              id="timer-ticket"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder={t("enterTicketId")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="timer-desc">{t("description")}</Label>
            <Input
              id="timer-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("whatAreYouWorkingOn")}
            />
          </div>
          <Button
            onClick={handleStart}
            disabled={!companyId || startTimer.isPending}
            size="sm"
          >
            {startTimer.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {t("startTimer")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
