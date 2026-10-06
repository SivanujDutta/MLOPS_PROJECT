"use client";

import { useState } from "react";
import { AlertTriangle, Mail } from "lucide-react";

export default function EmailVerificationBanner({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleResend = async () => {
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/verify-email/send", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification email");
      }

      setStatus("sent");
      setMessage("Verification email sent! Check your inbox.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <div className="w-full bg-[#FAFF00] border-b-[3px] border-black p-3 px-8 flex items-center justify-between">
      <div className="flex items-center text-black">
        <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
        <p className="text-sm font-bold uppercase tracking-wide">
          Please verify your email address (<span className="font-black">{email}</span>) to unlock full account access.
        </p>
      </div>

      <div className="flex items-center ml-4">
        {status === "error" && (
          <span className="text-xs font-bold text-red-600 mr-4 uppercase tracking-widest">{message}</span>
        )}
        {status === "sent" ? (
          <span className="text-xs font-bold text-black mr-4 uppercase tracking-widest flex items-center">
            <Mail className="h-4 w-4 mr-2" /> {message}
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={status === "loading"}
            className="text-xs font-black uppercase tracking-widest bg-black text-[#FAFF00] px-4 py-2 hover:bg-white hover:text-black hover:border-black border-[2px] border-black transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {status === "loading" ? "Sending..." : "Resend Email"}
          </button>
        )}
      </div>
    </div>
  );
}
