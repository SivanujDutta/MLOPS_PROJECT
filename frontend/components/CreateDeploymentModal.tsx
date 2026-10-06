"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Loader2, X } from "lucide-react";

type Model = {
  id: string;
  isDeployed: boolean;
  createdAt: Date;
  experiment: {
    dataset: { name: string };
    targetColumn: string;
    selectedFeatures: string[] | null;
  };
};

export default function CreateDeploymentModal({ models }: { models: Model[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [modelId, setModelId] = useState("");
  const [endpointSlug, setEndpointSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const undeployedModels = models.filter(m => !m.isDeployed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId, endpointSlug }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create deployment");

      setIsOpen(false);
      setModelId("");
      setEndpointSlug("");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center bg-[#0070F2] text-white font-black uppercase tracking-wider px-6 py-4 border-[3px] border-black hover:bg-blue-600 transition-colors"
      >
        <Rocket className="mr-2 h-5 w-5" />
        Create Deployment
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-[3px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full relative">
            
            {/* Header */}
            <div className="bg-[#82F5A0] border-b-[3px] border-black p-4 flex justify-between items-center">
              <h2 className="text-xl font-black text-black uppercase">Deploy Model</h2>
              <button onClick={() => setIsOpen(false)} className="text-black hover:bg-black hover:text-white p-1 border-2 border-transparent transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-100 border-[3px] border-red-500 text-red-700 font-bold">
                  Error: {error}
                </div>
              )}

              {undeployedModels.length === 0 ? (
                 <div className="text-center py-6">
                   <p className="font-bold text-lg mb-2">No undeployed models found.</p>
                   <p className="text-sm text-gray-600">Train a new model first to deploy it.</p>
                 </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-black text-black uppercase mb-2">Select Model</label>
                    <select
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      className="w-full border-[3px] border-black p-3 text-black font-medium bg-white focus:outline-none focus:ring-0 focus:border-[#0070F2] transition-colors appearance-none"
                      required
                    >
                      <option value="" disabled>-- Choose a Model --</option>
                      {undeployedModels.map(m => {
                        const date = new Date(m.createdAt).toLocaleString();
                        const features = m.experiment.selectedFeatures;
                        const featuresText = features ? `[${features.length} features]` : `[All features]`;
                        return (
                          <option key={m.id} value={m.id}>
                            {m.experiment.dataset.name} | {date} | {featuresText}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-black text-black uppercase mb-2">Endpoint Slug</label>
                    <div className="flex border-[3px] border-black bg-slate-100">
                      <span className="p-3 font-medium text-black border-r-[3px] border-black opacity-60">/api/predict/</span>
                      <input
                        type="text"
                        value={endpointSlug}
                        onChange={(e) => setEndpointSlug(e.target.value)}
                        placeholder="e.g. salary-model-v1"
                        className="flex-1 p-3 text-black font-medium bg-white focus:outline-none"
                        required
                        pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                        title="Lowercase letters, numbers, and hyphens only"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !modelId || !endpointSlug}
                    className="w-full bg-[#0070F2] text-white font-black uppercase tracking-wider p-4 border-[3px] border-black hover:bg-blue-600 disabled:opacity-50 flex justify-center transition-colors"
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Rocket className="h-5 w-5 mr-2" />}
                    Deploy to API
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
