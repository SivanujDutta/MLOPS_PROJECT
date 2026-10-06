import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowLeft, Target, Settings2, BarChart3, BrainCircuit, Activity } from "lucide-react";
import Link from "next/link";
import ShapGraph from "@/components/ShapGraph";

export default async function ModelReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch Experiment and its associated models
  const experiment = await prisma.experiment.findUnique({
    where: { id },
    include: {
      dataset: { select: { name: true, userId: true } },
      models: true,
    }
  });

  if (!experiment || experiment.dataset.userId !== payload.userId) {
    redirect("/experiments");
  }

  if (experiment.status !== "COMPLETED" || experiment.models.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-8 text-center">
        <h2 className="text-3xl font-black uppercase">Report Not Available</h2>
        <p className="mt-4 font-medium text-black/70">This experiment is not completed yet or has no model data.</p>
        <Link href="/experiments" className="mt-6 inline-block bg-black text-[#FAFF00] px-6 py-3 font-black uppercase border-2 border-black">
          Back to Projects
        </Link>
      </div>
    );
  }

  const model = experiment.models[0];
  const metrics = model.metrics as Record<string, number> || {};
  const hyperparameters = model.hyperparameters as Record<string, any> || {};
  
  // Backward compatible SHAP normalization (ensure it sums to 100%)
  const rawFeatureImportance = model.featureImportance as Record<string, number> || {};
  const totalImportance = Object.values(rawFeatureImportance).reduce((sum, val) => sum + val, 0) || 1;
  
  const sortedFeatures: [string, number][] = Object.entries(rawFeatureImportance)
    .map(([feature, importance]) => [feature, (importance / totalImportance) * 100] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  // Determine main metric
  const isClassification = experiment.taskType === "CLASSIFICATION";
  const mainMetricLabel = isClassification ? "Accuracy" : "Root Mean Squared Error";
  
  // Backward compatibility: compute RMSE if not explicitly available but MSE is
  const rmse = metrics.rmse ?? (metrics.mse ? Math.sqrt(metrics.mse) : 0);
  
  const mainMetricValue = isClassification 
    ? `${((metrics.accuracy || 0) * 100).toFixed(2)}%`
    : Number(rmse).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="max-w-5xl mx-auto py-8 text-black">
      {/* Back Button */}
      <Link href="/experiments" className="inline-flex items-center text-sm font-black text-black uppercase tracking-wider mb-8 hover:underline">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
      </Link>

      {/* Header */}
      <div className="mb-12 border-b-4 border-black pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black text-black tracking-tighter uppercase leading-none mb-4">
              Model Report
            </h1>
            <div className="flex items-center space-x-6 text-sm font-bold uppercase tracking-widest text-black/70">
              <span className="flex items-center"><Target className="w-4 h-4 mr-2" /> {experiment.targetColumn}</span>
              <span className="flex items-center"><Activity className="w-4 h-4 mr-2" /> {experiment.taskType}</span>
              <span className="flex items-center"><BrainCircuit className="w-4 h-4 mr-2" /> {model.algorithmName}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-black/50 mb-1">Dataset</div>
            <div className="text-xl font-black text-black bg-[#FAFF00] px-4 py-2 border-[3px] border-black inline-block">
              {experiment.dataset.name}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
        {/* Winning Model Block */}
        <div className="col-span-1 lg:col-span-1 border-[3px] border-black bg-[#FAFF00] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center">
          <h3 className="text-sm font-black text-black uppercase tracking-widest mb-4 flex items-center">
            <BrainCircuit className="w-5 h-5 mr-2" /> WINNING MODEL
          </h3>
          <div className="text-3xl xl:text-4xl font-black tracking-tighter text-black break-words uppercase">
            {model.algorithmName}
          </div>
          <div className="text-sm font-bold text-black mt-2 opacity-70 uppercase">Chosen by Auto-ML</div>
        </div>
        {/* KPI Block */}
        <div className="col-span-1 border-[3px] border-black bg-[#82F5A0] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black text-black uppercase tracking-widest mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" /> Performance
          </h3>
          <div className="text-5xl font-black tracking-tighter text-black break-words">
            {mainMetricValue}
          </div>
          <div className="text-sm font-bold text-black mt-2 opacity-70 uppercase">{mainMetricLabel}</div>
        </div>

        {/* Hyperparameters Block */}
        <div className="col-span-1 lg:col-span-2 border-[3px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-sm font-black text-black uppercase tracking-widest mb-6 flex items-center">
            <Settings2 className="w-5 h-5 mr-2" /> Optuna Hyperparameters
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(hyperparameters).map(([key, value]) => (
              <div key={key} className="border-2 border-black p-4 bg-slate-50">
                <div className="text-[10px] font-black text-black uppercase tracking-widest opacity-70 mb-1 truncate" title={key}>
                  {key}
                </div>
                <div className="text-lg font-black text-black break-words">
                  {String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SHAP Feature Importance */}
      <div className="border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-black text-white p-6 flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-wider">SHAP Feature Importance</h3>
          <span className="text-xs font-bold text-[#82F5A0] uppercase tracking-widest">Global Explanation</span>
        </div>
        
        <div className="p-8">
          <p className="text-sm font-medium text-black/70 mb-8 max-w-2xl">
            This chart shows which features had the biggest impact on the model's predictions. 
            Longer bars mean the feature was more important to the algorithm overall.
          </p>

          <div className="w-full h-96">
            <ShapGraph data={sortedFeatures} />
          </div>
        </div>
      </div>

    </div>
  );
}
