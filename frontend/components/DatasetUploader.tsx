"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used for toasts, if not I'll just use basic state or alert for now. Let's use standard state to keep it simple since sonner might not be installed.

export default function DatasetUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);

    try {
      const res = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setFile(null);
      // Force a server refresh to update the dataset table below
      router.refresh();
      alert("Dataset uploaded successfully!");
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`border-4 border-black p-8 transition-colors ${file ? 'bg-[#82F5A0]' : 'bg-white'}`}>
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        
        <div className="rounded-full bg-black p-4">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <UploadCloud className="h-8 w-8 text-white" />
          )}
        </div>

        <div>
          <h3 className="text-xl font-black text-black uppercase tracking-widest">
            {file ? file.name : "Upload New Dataset"}
          </h3>
          <p className="mt-2 text-sm font-medium text-black">
            {file ? "File ready for upload." : "Drag and drop your CSV file here, or click to browse."}
          </p>
        </div>

        {!file && (
          <label className="cursor-pointer inline-flex items-center justify-center rounded-sm bg-black px-6 py-3 text-sm font-bold text-white hover:bg-gray-800 transition-colors">
            Select CSV File
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}

        {file && (
          <div className="flex space-x-4">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex items-center justify-center rounded-sm bg-black px-8 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isUploading ? "Uploading..." : "Confirm Upload"}
            </button>
            <button
              onClick={() => setFile(null)}
              disabled={isUploading}
              className="inline-flex items-center justify-center rounded-sm bg-white border-2 border-black px-8 py-3 text-sm font-bold text-black hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
