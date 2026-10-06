"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="border-[4px] border-black bg-[#FAFF00] p-12 max-w-2xl w-full text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <AlertTriangle className="mx-auto h-16 w-16 text-black mb-6" />
        
        <h1 className="text-4xl font-black text-black uppercase tracking-tight mb-4">
          Something went wrong!
        </h1>
        
        <p className="text-lg font-bold text-black/70 mb-2">
          An error occurred while loading this page. This is usually caused by the database sleeping or a temporary network glitch.
        </p>
        
        <div className="bg-white border-2 border-black p-4 text-left my-6 overflow-auto max-h-40">
          <p className="font-mono text-sm text-red-600 font-bold">
            {error.message || "Internal Server Error"}
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center bg-black text-[#FAFF00] font-black uppercase tracking-wider px-8 py-4 border-[3px] border-transparent hover:bg-transparent hover:text-black hover:border-black transition-all"
        >
          <RefreshCcw className="mr-3 h-5 w-5" />
          Try Again
        </button>
      </div>
    </div>
  );
}
