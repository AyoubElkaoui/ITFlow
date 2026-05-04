"use client";

import { forwardRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(
  ({ value = "", onChange, className, placeholder = "HH:MM" }, ref) => {
    const [display, setDisplay] = useState(value);

    useEffect(() => {
      setDisplay(value);
    }, [value]);

    function handleChange(raw: string) {
      // Strip everything except digits and colon
      let clean = raw.replace(/[^0-9:]/g, "");

      // Auto-insert colon after 2 digits
      if (clean.length === 2 && !clean.includes(":") && raw.length > display.length) {
        clean = clean + ":";
      }

      // Limit to 5 chars (HH:MM)
      clean = clean.slice(0, 5);

      setDisplay(clean);

      // Only emit if complete and valid
      if (/^\d{2}:\d{2}$/.test(clean)) {
        const [h, m] = clean.split(":").map(Number);
        if (h <= 23 && m <= 59) {
          onChange?.(clean);
        }
      } else if (clean === "") {
        onChange?.("");
      }
    }

    function handleBlur() {
      if (!display) return;
      // Try to fix partial input: "9:0" → "09:00"
      const match = display.match(/^(\d{1,2}):?(\d{0,2})$/);
      if (match) {
        const h = match[1].padStart(2, "0");
        const m = (match[2] || "00").padStart(2, "0");
        const fixed = `${h}:${m}`;
        const [hh, mm] = fixed.split(":").map(Number);
        if (hh <= 23 && mm <= 59) {
          setDisplay(fixed);
          onChange?.(fixed);
        } else {
          setDisplay("");
          onChange?.("");
        }
      }
    }

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={5}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    );
  },
);

TimeInput.displayName = "TimeInput";
