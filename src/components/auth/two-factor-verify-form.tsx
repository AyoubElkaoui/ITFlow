"use client";

import { useRef, useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  email: string;
  password: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorVerifyForm({
  email,
  password,
  onSuccess,
  onCancel,
}: Props) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    // Only allow single digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setDigits(newDigits);
      // Focus the next empty input or the last one
      const nextEmpty = newDigits.findIndex((d) => !d);
      inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length !== 6) {
      toast.error("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        totpToken: code,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid verification code");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        onSuccess();
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  const code = digits.join("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      {/* 6 digit inputs */}
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="h-12 w-12 text-center text-lg font-mono"
            autoComplete="one-time-code"
          />
        ))}
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleVerify}
          className="w-full"
          disabled={loading || code.length !== 6}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
