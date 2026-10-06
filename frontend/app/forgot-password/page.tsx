"use client";

import { useState } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setStatus("success");
      setMessage(data.message || "Password reset link sent to your email.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md border-[4px] border-black p-10 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        
        <div className="flex items-center justify-center mb-8">
          <Sparkles className="h-10 w-10 text-black mr-3" />
          <h1 className="text-4xl font-black tracking-tighter text-black uppercase">NexusML</h1>
        </div>

        <h2 className="text-2xl font-black text-black uppercase tracking-widest mb-2 border-black">
          Forgot Password
        </h2>
        <p className="text-sm font-bold text-black/60 mb-6 border-b-4 border-black pb-4">
          Enter your email address to receive a password reset link.
        </p>

        {status === "error" && (
          <div className="mb-6 border-2 border-black bg-red-400 p-4 text-sm font-bold text-black">
            {message}
          </div>
        )}

        {status === "success" ? (
          <div className="mb-6 border-2 border-black bg-[#82F5A0] p-6 text-center">
            <h3 className="text-xl font-black uppercase mb-2">Check Your Inbox</h3>
            <p className="text-sm font-bold opacity-80">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-black text-black uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-black p-3 text-base font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#82F5A0] transition-all"
                placeholder="you@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full border-[3px] border-black bg-black text-[#FAFF00] py-4 text-lg font-black uppercase tracking-widest hover:bg-transparent hover:text-black transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/login" className="inline-flex items-center text-sm font-bold text-black hover:text-[#0070F2] underline">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
