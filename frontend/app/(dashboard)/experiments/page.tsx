import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExperimentWizard from "@/components/ExperimentWizard";
import ExperimentActions from "@/components/ExperimentActions";
import { Beaker, Settings2, Activity, Play, Download, BarChart3 } from "lucide-react";
import Link from "next/link";

export default async function ExperimentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    redirect("/login");
  }

  // Fetch Datasets
  const datasets = await prisma.dataset.findMany({
    where: { userId: payload.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      columnSchema: true,
    }
  });

  // Fetch Experiments (joined with dataset to get dataset name)
  const experiments = await prisma.experiment.findMany({
    where: {
      dataset: { userId: payload.userId }
    },
    include: {
      dataset: { select: { name: true } },
      models: { select: { id: true, s3ModelPath: true } }
    },
    orderBy: { createdAt: "desc" },
  });

  // Safe cast for JSON types
  const safeDatasets = datasets.map(d => ({
    id: d.id,
    name: d.name,
    columnSchema: d.columnSchema as string[] | null,
  }));

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-black text-black tracking-tighter uppercase">Projects</h1>
        <p className="text-lg font-medium text-black mt-2">
          Train Machine Learning models using your uploaded datasets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: The Wizard */}
        <div className="lg:col-span-1">
          {safeDatasets.length === 0 ? (
            <div className="border-[3px] border-black bg-[#FAFF00] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
              <Beaker className="mx-auto h-12 w-12 text-black mb-4" />
              <h3 className="text-xl font-black text-black uppercase">No Datasets</h3>
              <p className="text-black font-medium mt-2 mb-4">You need to upload a dataset before you can start an experiment.</p>
              <a href="/datasets" className="inline-flex items-center justify-center bg-black text-[#FAFF00] font-black uppercase px-6 py-3 border-[3px] border-black hover:bg-transparent hover:text-black transition-colors">
                Go to AI Catalog
              </a>
            </div>
          ) : (
            <ExperimentWizard datasets={safeDatasets} />
          )}
        </div>

        {/* Right Column: Active Experiments Table */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-6 flex items-center">
            <Activity className="h-6 w-6 mr-3" />
            Active Experiments
          </h2>

          {experiments.length === 0 ? (
            <div className="border-[3px] border-black bg-white p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <Play className="mx-auto h-12 w-12 text-black mb-4 opacity-20" />
              <h3 className="text-xl font-black text-black uppercase text-black/50">No Experiments Running</h3>
              <p className="text-black/50 font-medium mt-2">Use the wizard to start your first machine learning pipeline.</p>
            </div>
          ) : (
            <div className="border-[3px] border-black bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <table className="min-w-full divide-y-4 divide-black">
                <thead className="bg-[#82F5A0]">
                  <tr>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-black text-black uppercase tracking-wider border-r-[3px] border-black">Dataset</th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-black text-black uppercase tracking-wider border-r-[3px] border-black">Target</th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-black text-black uppercase tracking-wider border-r-[3px] border-black">Task</th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-black text-black uppercase tracking-wider border-r-[3px] border-black">Status</th>
                    <th scope="col" className="px-4 py-4 text-center text-sm font-black text-black uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black bg-white">
                  {experiments.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-black border-r-[3px] border-black">
                        <div>{exp.dataset.name}</div>
                        <div className="text-xs font-medium text-black/60 mt-1">
                          {new Date(exp.createdAt).toLocaleString()}
                        </div>
                        {exp.selectedFeatures && Array.isArray(exp.selectedFeatures) && (
                          <div className="text-[10px] font-black uppercase text-[#0070F2] mt-1 bg-blue-50 inline-block px-1 border border-[#0070F2]">
                            {exp.selectedFeatures.length} Features
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black border-r-[3px] border-black">
                        {exp.targetColumn}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black border-r-[3px] border-black">
                        {exp.taskType}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black border-r-[3px] border-black">
                        <span className={`px-2 py-1 border-2 border-black font-black text-xs uppercase ${
                          exp.status === 'COMPLETED' ? 'bg-[#82F5A0]' :
                          exp.status === 'FAILED' ? 'bg-red-400' :
                          exp.status === 'TRAINING' ? 'bg-[#0070F2] text-white' :
                          'bg-[#FAFF00]'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-black text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {exp.status === 'COMPLETED' && (
                            <Link
                              href={`/experiments/${exp.id}`}
                              className="inline-flex items-center justify-center p-2 border-2 border-black bg-white text-black hover:bg-[#82F5A0] transition-colors"
                              title="View Model Report"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Link>
                          )}
                          {exp.status === 'COMPLETED' && exp.models?.[0]?.s3ModelPath && (
                            <a 
                              href={`/api/models/${exp.models[0].id}/download`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-2 border-2 border-black bg-black text-[#FAFF00] hover:bg-transparent hover:text-black transition-colors"
                              title="Download Model (.joblib)"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                          <ExperimentActions experimentId={exp.id} status={exp.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
