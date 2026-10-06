"use client";

import { useState, useEffect } from "react";
import { Loader2, Play, Zap } from "lucide-react";

type Deployment = {
  id: string;
  endpointSlug: string;
  model: {
    experiment: {
      targetColumn: string;
      selectedFeatures: string[] | null;
      dataset: {
        columnSchema: string[] | null;
      };
    };
  };
};

export default function TestEndpointForm({ deployment }: { deployment: Deployment }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [prediction, setPrediction] = useState<number | string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const columnSchema = deployment.model.experiment.dataset.columnSchema || [];
  const targetColumn = deployment.model.experiment.targetColumn;
  const selectedFeatures = deployment.model.experiment.selectedFeatures;
  
  // Filter out the target column to get only the input features
  // If the user selected specific features during training, use those instead!
  const featureColumns = selectedFeatures 
    ? selectedFeatures
    : columnSchema.filter(col => col !== targetColumn);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPrediction(null);
    setLatency(null);
    setIsLoading(true);

    // Convert string inputs to numbers where appropriate
    const parsedData: Record<string, any> = {};
    for (const key in formData) {
       const val = formData[key];
       parsedData[key] = isNaN(Number(val)) ? val : Number(val);
    }

    try {
      const res = await fetch(`/api/deployments/${deployment.endpointSlug}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputData: parsedData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prediction failed");

      setPrediction(data.prediction);
      setLatency(data.latencyMs);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
      <div className="mb-6 border-b-[3px] border-black pb-4">
        <h3 className="text-xl font-black text-black uppercase">Live Inference</h3>
        <p className="text-sm font-medium text-black opacity-70 mt-1">
          Predicting: <span className="bg-[#FAFF00] px-1 font-bold">{targetColumn}</span>
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border-[3px] border-red-500 text-red-700 font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featureColumns.map((feature, index) => {
            const displayName = feature.trim() === '' ? `Unnamed Feature ${index + 1}` : feature;
            return (
              <div key={feature || `unnamed-${index}`}>
                <label className="block text-xs font-black text-black uppercase mb-1">{displayName}</label>
                <input
                  type="text"
                  name={feature}
                  value={formData[feature] || ''}
                  onChange={handleInputChange}
                  className="w-full border-2 border-black p-2 text-black text-sm font-bold bg-white focus:outline-none focus:ring-0 focus:border-[#0070F2] transition-colors"
                  required
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 bg-slate-100 border-[3px] border-black p-4">
          <p className="text-xs font-black text-black uppercase mb-2 opacity-60">API Integration</p>
          <pre className="text-xs font-mono text-black overflow-x-auto whitespace-pre-wrap">
{`curl -X POST ${baseUrl}/api/deployments/${deployment.endpointSlug}/predict \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"inputData": { ${featureColumns.map(f => `"${f}": 0`).join(', ')} }}'`}
          </pre>
        </div>

        <button
          type="submit"
          disabled={isLoading || featureColumns.length === 0}
          className="w-full mt-4 bg-black text-[#82F5A0] font-black uppercase tracking-wider p-4 border-[3px] border-black hover:bg-[#82F5A0] hover:text-black transition-colors flex justify-center disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
          ) : (
            <Play className="h-5 w-5 mr-2" fill="currentColor" />
          )}
          Run Prediction
        </button>
      </form>

      {prediction !== null && (
        <div className="mt-8 border-[3px] border-black p-6 bg-[#FAFF00] text-center transform hover:-translate-y-1 transition-transform duration-200">
          <p className="text-sm font-black text-black uppercase tracking-widest mb-2 opacity-70">Result</p>
          <div className="text-4xl font-black text-black mb-4">
            {typeof prediction === 'number' ? (
              Number.isInteger(prediction) ? prediction : prediction.toFixed(2)
            ) : prediction}
          </div>
          {latency && (
             <p className="text-xs font-bold text-black opacity-60 flex items-center justify-center">
               <Zap className="h-3 w-3 mr-1" />
               Latency: {latency}ms
             </p>
          )}
        </div>
      )}
    </div>
  );
}
