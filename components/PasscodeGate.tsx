"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

const PASSCODE = "2206";
const SESSION_KEY = "demo-unlocked";

// Client-side passcode gate — wraps protected content.
// Stores unlock state in sessionStorage so the user only
// enters the code once per browser tab.
export default function PasscodeGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check if already unlocked this session
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      setUnlocked(true);
    }
  }, []);

  // Auto-submit when all 4 digits are filled
  useEffect(() => {
    const code = digits.join("");
    if (code.length === 4) {
      if (code === PASSCODE) {
        sessionStorage.setItem(SESSION_KEY, "true");
        setUnlocked(true);
      } else {
        setError(true);
        // Clear after a brief shake animation
        setTimeout(() => {
          setDigits(["", "", "", ""]);
          setError(false);
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  }, [digits]);

  const handleChange = (index: number, value: string) => {
    // Only accept single digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    // Auto-advance to next input
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace moves to previous input
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-focus first input on mount
  useEffect(() => {
    if (!unlocked) {
      inputRefs.current[0]?.focus();
    }
  }, [unlocked]);

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="flex flex-col items-center gap-8">
        {/* Logo / brand */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl font-bold text-white tracking-tight">
            MVC
          </div>
          <p className="text-sm text-blue-300/70">
            Enter access code to continue
          </p>
        </div>

        {/* 4-digit input */}
        <div
          className={`flex gap-3 ${error ? "animate-shake" : ""}`}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-14 h-16 text-center text-2xl font-mono rounded-lg border-2 bg-white/5 text-white outline-none transition-colors
                ${error ? "border-red-400" : "border-white/20 focus:border-blue-400"}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-400">Incorrect code</p>
        )}

        {/* Contact for access */}
        <p className="text-sm text-white/40">
          Need access?{" "}
          <a
            href="mailto:jacobrsalomon@gmail.com"
            className="text-blue-300/70 hover:text-blue-300 transition-colors underline"
          >
            jacobrsalomon@gmail.com
          </a>
        </p>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
