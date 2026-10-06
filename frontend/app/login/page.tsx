"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      // If successful, the backend set the HTTP-only cookie.
      // Redirect to the dashboard datasets page!
      router.push("/datasets");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md border-[4px] border-black p-10 bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        
        <div className="flex items-center justify-center mb-8">
          <Sparkles className="h-10 w-10 text-black mr-3" />
          <h1 className="text-4xl font-black tracking-tighter text-black uppercase">NexusML</h1>
        </div>

        <h2 className="text-2xl font-black text-black uppercase tracking-widest mb-6 border-b-4 border-black pb-4">
          Login
        </h2>

        {error && (
          <div className="mb-6 border-2 border-black bg-[#FAFF00] p-4 text-sm font-bold text-black">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-black text-black uppercase tracking-wider">
                Password
              </label>
              <a href="/forgot-password" className="text-xs font-bold text-black hover:text-[#0070F2] underline uppercase tracking-widest">
                Forgot?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-2 border-black p-3 text-base font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-[#82F5A0] transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full border-[3px] border-black bg-[#82F5A0] py-4 text-lg font-black text-black uppercase tracking-widest hover:bg-[#68e088] transition-colors disabled:opacity-50"
          >
            {isLoading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-sm font-bold text-black">
            Don't have an account? <a href="/register" className="underline hover:text-[#0070F2]">Sign up</a>
          </p>
        </div>

      </div>
    </div>
  );
}
