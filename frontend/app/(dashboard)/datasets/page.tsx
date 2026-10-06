import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import DatasetUploader from "@/components/DatasetUploader";
import { Database, Calendar, Hash, Columns } from "lucide-react";

export default async function DatasetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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

  const { q } = await searchParams;

  const datasets = await prisma.dataset.findMany({
    where: { 
      userId: payload.userId,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {})
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto py-8">
      
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-black text-black tracking-tighter uppercase">AI Catalog</h1>
        <p className="text-lg font-medium text-black mt-2">
          Upload and manage your raw data. All files are securely synced to AWS S3.
        </p>
      </div>

      {/* Uploader Component */}
      <div className="mb-16">
        <DatasetUploader />
      </div>

      {/* Datasets Table */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-black uppercase tracking-tight">
            {q ? `Search Results for "${q}"` : "Your Datasets"}
          </h2>
          {q && (
            <a href="/datasets" className="text-sm font-bold text-black border-b-2 border-black hover:text-[#0070F2] hover:border-[#0070F2]">
              Clear Search
            </a>
          )}
        </div>
        
        {datasets.length === 0 ? (
          <div className="border-[3px] border-black bg-[#FAFF00] p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Database className="mx-auto h-12 w-12 text-black mb-4" />
            <h3 className="text-xl font-black text-black uppercase">
              {q ? "No Matching Datasets" : "No Datasets Found"}
            </h3>
            <p className="text-black font-medium mt-2">
              {q ? "Try a different search term." : "Upload your first CSV file above to start training models."}
            </p>
          </div>
        ) : (
          <div className="border-[3px] border-black bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <table className="min-w-full divide-y-4 divide-black">
              <thead className="bg-[#82F5A0]">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider border-r-[3px] border-black">
                    Dataset Name
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider border-r-[3px] border-black">
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 mr-2" /> Rows
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider border-r-[3px] border-black">
                    <div className="flex items-center">
                      <Columns className="h-4 w-4 mr-2" /> Columns
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-black text-black uppercase tracking-wider">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" /> Uploaded
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black bg-white">
                {datasets.map((dataset) => (
                  <tr key={dataset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black border-r-[3px] border-black">
                      {dataset.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black border-r-[3px] border-black">
                      {dataset.rowCount?.toLocaleString() || "N/A"} rows
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black border-r-[3px] border-black">
                      {(dataset.columnSchema as string[])?.length || 0} features
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                      {new Date(dataset.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
