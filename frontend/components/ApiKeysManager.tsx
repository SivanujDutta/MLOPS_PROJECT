"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
};

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch keys");
      }
      const data = await res.json();
      setKeys(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      if (!res.ok) throw new Error("Failed to create key");
      
      const newKey = await res.json();
      setKeys([newKey, ...keys]);
      setNewKeyName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Any applications using it will immediately lose access.")) return;
    
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      setKeys(keys.filter(k => k.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-black" /></div>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-100 border-[3px] border-red-500 text-red-700 font-bold flex items-center">
          <AlertTriangle className="mr-3 h-5 w-5" />
          {error}
        </div>
      )}

      {/* Create Key Section */}
      <div className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-xl font-black text-black uppercase mb-4 flex items-center">
          <Plus className="mr-2 h-6 w-6" />
          Create New API Key
        </h3>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Production Frontend API Key"
            className="flex-1 border-2 border-black p-3 text-black font-bold focus:outline-none focus:border-[#0070F2]"
            required
            maxLength={50}
          />
          <button
            type="submit"
            disabled={isCreating || !newKeyName}
            className="bg-[#82F5A0] text-black font-black uppercase tracking-wider px-8 border-[3px] border-black hover:bg-[#68e088] disabled:opacity-50 transition-colors"
          >
            {isCreating ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : "Generate Key"}
          </button>
        </form>
      </div>

      {/* List Keys Section */}
      <div className="border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-black text-[#FAFF00] p-4 flex items-center">
          <Key className="mr-3 h-5 w-5" />
          <h3 className="text-lg font-black uppercase tracking-widest">Active API Keys</h3>
        </div>
        
        {keys.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-xl font-black text-black opacity-40 uppercase">No API Keys Generated</p>
            <p className="font-medium mt-2">Generate a key above to start making programmatic requests.</p>
          </div>
        ) : (
          <div className="divide-y-[3px] divide-black">
            {keys.map((key) => (
              <div key={key.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <h4 className="text-lg font-black text-black">{key.name}</h4>
                  <p className="text-sm font-bold text-black opacity-50 mt-1">
                    Created on {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                  
                  <div className="flex items-center mt-3 gap-2">
                    <code className="bg-slate-200 border-2 border-black px-3 py-1 font-mono text-sm font-bold text-black flex-1 max-w-md truncate">
                      {key.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.id, key.key)}
                      className="p-2 border-2 border-black hover:bg-[#FAFF00] transition-colors"
                      title="Copy API Key"
                    >
                      {copiedId === key.id ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-black" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="ml-8">
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="flex items-center text-red-600 font-black uppercase text-sm border-2 border-transparent hover:border-red-600 hover:bg-red-50 p-3 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
