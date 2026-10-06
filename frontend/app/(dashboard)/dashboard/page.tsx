import Link from "next/link";
import { Plus, BarChart3, Database, Activity, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardHome() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/');
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    redirect('/');
  }

  const userId = payload.userId as string;

  // Fetch KPI data
  const datasetsCount = await prisma.dataset.count({
    where: { userId }
  });

  const activeDeploymentsCount = await prisma.deployment.count({
    where: {
      status: 'ACTIVE',
      model: { experiment: { dataset: { userId } } }
    }
  });

  const deployments = await prisma.deployment.findMany({
    where: { model: { experiment: { dataset: { userId } } } },
    select: { totalRequests: true }
  });
  const totalPredictions = deployments.reduce((acc, dep) => acc + dep.totalRequests, 0);

  // Fetch recent projects
  const recentProjects = await prisma.experiment.findMany({
    where: { dataset: { userId } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      dataset: { select: { name: true } },
      models: {
        select: { id: true, isDeployed: true }
      }
    }
  });

  return (
    <div className="max-w-6xl mx-auto py-12">
      {/* Massive Brutalist Header Section */}
      <div className="mb-16 max-w-3xl">
        <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-black leading-none mb-6">
          You've uploaded the CSVs.
        </h1>
        <p className="text-2xl font-medium text-black tracking-tight leading-tight mb-10">
          Train, tune, and deploy enterprise machine learning models in seconds.
        </p>
        
        <div className="flex items-center space-x-4">
          <Link 
            href="/experiments/new"
            className="inline-flex items-center justify-center rounded-sm bg-[#82F5A0] px-8 py-4 text-base font-bold text-black border-[3px] border-black hover:bg-[#68e088] transition-colors"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" strokeWidth={3} />
            Create New Project
          </Link>
          <Link 
            href="/datasets"
            className="inline-flex items-center justify-center rounded-sm bg-white px-8 py-4 text-base font-bold text-black border-[3px] border-black hover:bg-slate-100 transition-colors"
          >
            Upload Dataset
          </Link>
        </div>
      </div>

      {/* KPI Cards (Brutalist style) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-12">
        <div className="border-[3px] border-black bg-[#FAFF00] p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-black uppercase tracking-widest">Active Deployments</p>
            <Activity className="h-6 w-6 text-black" />
          </div>
          <p className="mt-4 text-5xl font-black text-black">{activeDeploymentsCount}</p>
        </div>
        
        <div className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-black uppercase tracking-widest">Total Predictions</p>
            <BarChart3 className="h-6 w-6 text-black" />
          </div>
          <p className="mt-4 text-5xl font-black text-black">{totalPredictions.toLocaleString()}</p>
        </div>

        <div className="border-[3px] border-black bg-[#82F5A0] p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-black uppercase tracking-widest">Datasets</p>
            <Database className="h-6 w-6 text-black" />
          </div>
          <p className="mt-4 text-5xl font-black text-black">{datasetsCount}</p>
        </div>
      </div>

      {/* Recent Projects Placeholder */}
      <div className="border-4 border-black bg-white overflow-hidden">
        <div className="border-b-4 border-black bg-black px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Recent Projects</h3>
          <Link href="/experiments" className="text-xs font-bold text-[#82F5A0] hover:underline uppercase">View All</Link>
        </div>
        
        {recentProjects.length === 0 ? (
          <div className="p-16 text-center">
            <BeakerIcon className="mx-auto h-16 w-16 text-black opacity-30" />
            <h3 className="mt-4 text-xl font-black text-black opacity-40 uppercase">No projects yet</h3>
            <p className="mt-2 text-base font-bold text-black opacity-60">Get started by creating a new AutoML project.</p>
          </div>
        ) : (
          <div className="divide-y-4 divide-black">
            {recentProjects.map((project) => {
              const hasDeployment = project.models.some((m: any) => m.isDeployed);
              
              return (
                <div key={project.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center">
                    <div className="bg-[#FAFF00] border-2 border-black p-3 mr-6">
                      <Clock className="h-6 w-6 text-black" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-black capitalize">{project.taskType.toLowerCase()} on {project.dataset.name}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs font-bold px-2 py-1 uppercase border-2 border-black ${
                          project.status === 'COMPLETED' ? 'bg-[#82F5A0]' :
                          project.status === 'FAILED' ? 'bg-red-400' : 'bg-yellow-300'
                        }`}>
                          {project.status}
                        </span>
                        <span className="text-sm font-bold text-black opacity-50">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {hasDeployment && (
                    <span className="text-xs font-black uppercase tracking-widest text-[#0070F2] flex items-center">
                      <Activity className="h-4 w-4 mr-1" /> Deployed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BeakerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M4.5 3h15" />
      <path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" />
      <path d="M6 14h12" />
    </svg>
  );
}
