"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setStatus("error");
      setMessage("Missing reset token in URL.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setStatus("success");
      setMessage("Your password has been successfully reset. You can now log in.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <div className="w-full max-w-md border-[4px] border-black p-10 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-center mb-8">
        <Sparkles className="h-10 w-10 text-black mr-3" />
        <h1 className="text-4xl font-black tracking-tighter text-black uppercase">NexusML</h1>
      </div>

      <h2 className="text-2xl font-black text-black uppercase tracking-widest mb-2 border-black">
        Reset Password
      </h2>
      <p className="text-sm font-bold text-black/60 mb-6 border-b-4 border-black pb-4">
        Enter a new password for your account.
      </p>

      {status === "error" && (
        <div className="mb-6 border-2 border-black bg-red-400 p-4 text-sm font-bold text-black">
          {message}
        </div>
      )}

      {status === "success" ? (
        <div className="text-center">
          <div className="mb-6 border-2 border-black bg-[#82F5A0] p-6">
            <h3 className="text-xl font-black uppercase mb-2">Password Updated</h3>
            <p className="text-sm font-bold opacity-80">{message}</p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full border-[3px] border-black bg-black text-[#FAFF00] py-4 text-lg font-black uppercase tracking-widest hover:bg-transparent hover:text-black transition-colors"
          >
            Go to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-black text-black uppercase tracking-wider mb-2">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-black p-3 text-base font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#82F5A0] transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading" || !token}
            className="w-full border-[3px] border-black bg-[#82F5A0] py-4 text-lg font-black text-black uppercase tracking-widest hover:bg-[#68e088] transition-colors disabled:opacity-50"
          >
            {status === "loading" ? "Updating..." : "Reset Password"}
          </button>
        </form>
      )}
      
      {!token && status !== "success" && (
         <div className="mt-4 border-2 border-black bg-[#FAFF00] p-4 text-xs font-bold text-black text-center">
           Warning: No token found in URL. Request a new password reset link.
         </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <Suspense fallback={<div className="font-black uppercase tracking-widest animate-pulse">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
