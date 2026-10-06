import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Rocket, Activity } from "lucide-react";
import CreateDeploymentModal from "@/components/CreateDeploymentModal";
import TestEndpointForm from "@/components/TestEndpointForm";
import DeleteDeploymentButton from "@/components/DeleteDeploymentButton";

export default async function DeploymentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    redirect("/login");
  }

  // 1. Fetch completed models that belong to the user
  const models = await prisma.model.findMany({
    where: {
      experiment: {
        dataset: { userId: payload.userId },
        status: "COMPLETED",
      }
    },
    include: {
      experiment: {
        include: { dataset: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch Active Deployments
  const deployments = await prisma.deployment.findMany({
    where: {
      model: {
        experiment: {
          dataset: { userId: payload.userId }
        }
      }
    },
    include: {
      model: {
        include: {
          experiment: {
            include: { dataset: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const safeModels = models.map(m => ({
    id: m.id,
    isDeployed: m.isDeployed,
    createdAt: m.createdAt,
    experiment: {
      dataset: { name: m.experiment.dataset.name },
      targetColumn: m.experiment.targetColumn,
      selectedFeatures: m.experiment.selectedFeatures as string[] | null,
    }
  }));

  const safeDeployments = deployments.map(d => ({
    id: d.id,
    endpointSlug: d.endpointSlug,
    model: {
      experiment: {
        targetColumn: d.model.experiment.targetColumn,
        selectedFeatures: d.model.experiment.selectedFeatures as string[] | null,
        dataset: {
          columnSchema: d.model.experiment.dataset.columnSchema as string[] | null,
        }
      }
    }
  }));

  const activeDeployment = safeDeployments.length > 0 ? safeDeployments[0] : null;

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter uppercase">Deployments</h1>
          <p className="text-lg font-medium text-black mt-2">
            Turn your AI models into scalable API endpoints.
          </p>
        </div>
        <CreateDeploymentModal models={safeModels} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: List of Deployments */}
        <div>
          <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-6 flex items-center">
            <Activity className="h-6 w-6 mr-3" />
            Active Endpoints
          </h2>

          {deployments.length === 0 ? (
            <div className="border-[3px] border-black bg-white p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <Rocket className="mx-auto h-12 w-12 text-black mb-4 opacity-20" />
              <h3 className="text-xl font-black text-black uppercase text-black/50">No Active Deployments</h3>
              <p className="text-black/50 font-medium mt-2">Deploy a model to start serving predictions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deployments.map((dep) => (
                <div key={dep.id} className="border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transition-transform hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-black text-[#0070F2] uppercase">/api/predict/{dep.endpointSlug}</h3>
                      <p className="text-sm font-bold text-black opacity-70 mt-1">
                        Model: {dep.model.experiment.dataset.name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-[#82F5A0] border-2 border-black font-black text-xs uppercase text-black">
                        {dep.status}
                      </span>
                      <DeleteDeploymentButton deploymentId={dep.id} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t-2 border-black border-dashed">
                    <div>
                      <p className="text-xs font-black uppercase opacity-60">Total Requests</p>
                      <p className="text-xl font-black">{dep.totalRequests}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase opacity-60">Target</p>
                      <p className="text-xl font-black">{dep.model.experiment.targetColumn}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Live Prediction Testing UI */}
        <div>
           {activeDeployment ? (
             <TestEndpointForm deployment={activeDeployment} />
           ) : (
             <div className="border-[3px] border-black bg-[#FAFF00] p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col justify-center items-center">
                <h3 className="text-2xl font-black text-black uppercase mb-4">Live Testing</h3>
                <p className="text-black font-medium">
                  Once you deploy an endpoint, you can test it live right here without writing any code.
                </p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
