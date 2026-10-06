"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Beaker, Play, Check } from "lucide-react";

type Dataset = {
  id: string;
  name: string;
  columnSchema: string[] | null;
};

interface ExperimentWizardProps {
  datasets: Dataset[];
}

export default function ExperimentWizard({ datasets }: ExperimentWizardProps) {
  const router = useRouter();
  
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [taskType, setTaskType] = useState<"REGRESSION" | "CLASSIFICATION">("REGRESSION");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [optunaTrials, setOptunaTrials] = useState<number>(10);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);
  const columns = selectedDataset?.columnSchema || [];

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDatasetId || !targetColumn || !taskType) {
      setError("Please fill out all fields.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datasetId: selectedDatasetId,
          targetColumn,
          taskType,
          selectedFeatures,
          optunaTrials
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start experiment");
      }

      // Reset form on success
      setSelectedDatasetId("");
      setTargetColumn("");
      setTaskType("REGRESSION");
      
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
      <div className="flex items-center mb-6">
        <div className="h-12 w-12 bg-[#82F5A0] border-[3px] border-black flex items-center justify-center mr-4">
          <Beaker className="h-6 w-6 text-black" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-black uppercase tracking-tight">Experiment Wizard</h2>
          <p className="text-black font-medium">Configure and launch a new Machine Learning pipeline.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border-[3px] border-red-500 text-red-700 font-bold">
          Error: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Dataset */}
        <div>
          <label className="block text-sm font-black text-black uppercase mb-2">
            1. Select Dataset
          </label>
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              setTargetColumn(""); // Reset target column when dataset changes
            }}
            className="w-full border-[3px] border-black p-3 text-black font-medium bg-white focus:outline-none focus:ring-0 focus:border-[#0070F2] transition-colors appearance-none"
            required
          >
            <option value="" disabled>-- Choose a dataset --</option>
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Target Column */}
        {selectedDataset && (
          <div>
            <label className="block text-sm font-black text-black uppercase mb-2">
              2. Select Target Column
            </label>
            <select
              value={targetColumn}
              onChange={(e) => {
                const val = e.target.value;
                setTargetColumn(val);
                setSelectedFeatures(columns.filter(c => c !== val));
              }}
              className="w-full border-[3px] border-black p-3 text-black font-medium bg-white focus:outline-none focus:ring-0 focus:border-[#0070F2] transition-colors appearance-none"
              required
            >
              <option value="" disabled>-- Choose the column to predict --</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 3: Task Type */}
        {targetColumn && (
          <div>
            <label className="block text-sm font-black text-black uppercase mb-2">
              3. ML Task Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="taskType"
                  value="REGRESSION"
                  checked={taskType === "REGRESSION"}
                  onChange={() => setTaskType("REGRESSION")}
                  className="sr-only"
                />
                <div className={`border-[3px] border-black p-4 text-center break-words transition-colors flex flex-col justify-center h-full ${taskType === "REGRESSION" ? "bg-[#82F5A0] font-black text-black" : "bg-white font-medium text-black hover:bg-slate-50"}`}>
                  <div className="text-sm md:text-base tracking-tighter sm:tracking-normal">REGRESSION</div>
                  <span className="block text-xs mt-1 text-black/70 font-normal">Predict a continuous number</span>
                </div>
              </label>
              
              <label className="cursor-pointer min-w-0">
                <input
                  type="radio"
                  name="taskType"
                  value="CLASSIFICATION"
                  checked={taskType === "CLASSIFICATION"}
                  onChange={() => setTaskType("CLASSIFICATION")}
                  className="sr-only"
                />
                <div className={`border-[3px] border-black p-4 text-center break-words transition-colors flex flex-col justify-center h-full ${taskType === "CLASSIFICATION" ? "bg-[#82F5A0] font-black text-black" : "bg-white font-medium text-black hover:bg-slate-50"}`}>
                  <div className="text-[11px] sm:text-sm md:text-base tracking-tighter sm:tracking-normal">CLASSIFICATION</div>
                  <span className="block text-xs mt-1 text-black/70 font-normal">Predict a category / class</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 4: Select Features */}
        {targetColumn && (
          <div>
            <label className="block text-sm font-black text-black uppercase mb-2 flex items-center justify-between">
              <span>4. Select Features</span>
              <span className="text-xs text-black/60 font-medium normal-case">{selectedFeatures.length} selected</span>
            </label>
            <div className="border-[3px] border-black bg-white max-h-64 overflow-y-auto p-4 space-y-2">
              {columns.filter(col => col !== targetColumn).map((col, idx) => {
                const isSelected = selectedFeatures.includes(col);
                const displayName = col.trim() === "" ? `Unnamed Feature ${idx + 1}` : col;
                
                return (
                  <label key={col || `unnamed-${idx}`} className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-slate-50 border-2 border-transparent hover:border-black transition-colors">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={isSelected} 
                      onChange={() => toggleFeature(col)} 
                    />
                    <div className={`w-6 h-6 border-2 border-black flex items-center justify-center ${isSelected ? 'bg-[#0070F2]' : 'bg-white'}`}>
                      {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                    </div>
                    <span className={`text-sm font-black uppercase ${isSelected ? 'text-black' : 'text-gray-500 line-through decoration-gray-400'}`}>
                      {displayName}
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedFeatures.length === 0 && (
              <p className="text-xs font-bold text-red-500 mt-2 uppercase">You must select at least one feature.</p>
            )}
          </div>
        )}

        {/* Step 5: Optuna Trials */}
        {targetColumn && selectedFeatures.length > 0 && (
          <div>
            <label className="block text-sm font-black text-black uppercase mb-2 flex items-center justify-between">
              <span>5. Tuning Trials (Optuna)</span>
              <span className="text-xs text-black/60 font-medium normal-case">{optunaTrials} trials</span>
            </label>
            <input 
              type="range" 
              min="5" max="100" step="5"
              value={optunaTrials} 
              onChange={(e) => setOptunaTrials(parseInt(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
            <p className="text-xs text-black/60 font-medium mt-1">
              Higher trials = better accuracy but takes longer to train.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !selectedDatasetId || !targetColumn || selectedFeatures.length === 0}
          className="w-full mt-6 bg-[#0070F2] text-white font-black uppercase tracking-wider p-4 border-[3px] border-black hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Starting Experiment...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" fill="currentColor" />
              Start Training
            </>
          )}
        </button>
      </form>
    </div>
  );
}
