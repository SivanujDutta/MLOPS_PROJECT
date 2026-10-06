"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, StopCircle } from "lucide-react";

interface ExperimentActionsProps {
  experimentId: string;
  status: "QUEUED" | "TUNING" | "TRAINING" | "COMPLETED" | "FAILED";
}

export default function ExperimentActions({ experimentId, status }: ExperimentActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRunning = status === "QUEUED" || status === "TUNING" || status === "TRAINING";

  const handleDelete = async () => {
    const actionName = isRunning ? "halt and delete" : "delete";
    if (!confirm(`Are you sure you want to ${actionName} this experiment?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/experiments/${experimentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete experiment");
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className={`inline-flex items-center justify-center p-2 border-2 border-black transition-colors ${
          isRunning
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-white text-red-500 hover:bg-red-50"
        } disabled:opacity-50`}
        title={isRunning ? "Halt Training" : "Delete Experiment"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRunning ? (
          <StopCircle className="h-4 w-4" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
      {error && <span className="text-[10px] text-red-500 font-bold mt-1 max-w-[80px] text-center leading-tight">{error}</span>}
    </div>
  );
}
