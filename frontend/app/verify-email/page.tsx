"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function VerifyEmailLogic() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email address...");
  
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided in the URL.");
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/verify-email/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to verify email");
        }

        setStatus("success");
        setMessage("Your email has been successfully verified! You can now access all features.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="w-full max-w-md border-[4px] border-black p-10 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center">
      <div className="flex items-center justify-center mb-8">
        <Sparkles className="h-10 w-10 text-black mr-3" />
        <h1 className="text-4xl font-black tracking-tighter text-black uppercase">NexusML</h1>
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 animate-spin mb-4" />
          <h2 className="text-xl font-black uppercase tracking-widest mb-2">Verifying...</h2>
          <p className="text-sm font-bold text-black/60">{message}</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center">
          <CheckCircle2 className="w-16 h-16 text-[#82F5A0] mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Verified!</h2>
          <p className="text-sm font-bold text-black/80 mb-8">{message}</p>
          <Link
            href="/dashboard"
            className="w-full border-[3px] border-black bg-black text-[#FAFF00] py-4 text-lg font-black uppercase tracking-widest hover:bg-transparent hover:text-black transition-colors inline-block"
          >
            Go to Dashboard
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-widest mb-2 text-red-500">Verification Failed</h2>
          <p className="text-sm font-bold text-black/80 mb-8">{message}</p>
          <Link
            href="/dashboard"
            className="w-full border-[3px] border-black bg-white text-black py-4 text-lg font-black uppercase tracking-widest hover:bg-black hover:text-[#FAFF00] transition-colors inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <Suspense fallback={<div className="font-black uppercase tracking-widest animate-pulse">Loading...</div>}>
        <VerifyEmailLogic />
      </Suspense>
    </div>
  );
}
