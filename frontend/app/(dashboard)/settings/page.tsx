import ApiKeysManager from "@/components/ApiKeysManager";

export const metadata = {
  title: "Settings - NexusML",
};

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="mb-10 border-b-[4px] border-black pb-6">
        <h1 className="text-4xl font-black text-black tracking-tighter uppercase mb-2">Settings</h1>
        <p className="text-lg font-medium text-black opacity-70">
          Manage your account, preferences, and API access keys.
        </p>
      </div>

      <div className="space-y-12">
        
        {/* API Keys Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-black uppercase tracking-tight">API Keys</h2>
            <p className="font-medium text-black mt-2">
              Use API keys to authenticate programmatic requests to your deployed inference endpoints.
              Keep your keys secure and never expose them in client-side code.
            </p>
          </div>
          
          <ApiKeysManager />
        </section>

      </div>
    </div>
  );
}
