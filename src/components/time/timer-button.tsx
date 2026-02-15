"use client";

import { Play, Square, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useActiveTimer,
  useStartTimer,
  useStopTimer,
} from "@/hooks/use-timer";

interface TimerButtonProps {
  ticketId: string;
  companyId: string;
}

export function TimerButton({ ticketId, companyId }: TimerButtonProps) {
  const { data: timer, isLoading } = useActiveTimer();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  const isTimerForThisTicket = timer?.ticketId === ticketId;
  const isTimerForDifferentTicket = !!timer && !isTimerForThisTicket;

  const handleStart = () => {
    startTimer.mutate({ companyId, ticketId });
  };

  const handleStop = () => {
    stopTimer.mutate();
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  // Timer is running for this ticket - show stop button
  if (isTimerForThisTicket) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStop}
              disabled={stopTimer.isPending}
            >
              {stopTimer.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Square className="size-4" />
              )}
              Stop Timer
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop timer and save time entry</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Timer is running for a different ticket - show disabled
  if (isTimerForDifferentTicket) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled>
              <Clock className="size-4" />
              Timer Active
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Timer is running for another ticket
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // No active timer - show start button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStart}
            disabled={startTimer.isPending}
          >
            {startTimer.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Start Timer
          </Button>
        </TooltipTrigger>
        <TooltipContent>Start timing this ticket</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
