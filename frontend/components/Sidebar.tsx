"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Database, Beaker, Rocket, Settings, Sparkles, LogOut } from "lucide-react";

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Catalog', href: '/datasets', icon: Database },
  { name: 'Projects', href: '/experiments', icon: Beaker },
  { name: 'Deployments', href: '/deployments', icon: Rocket },
];

export default function Sidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white text-black border-r border-black">
      {/* Brand Logo Area */}
      <div className="flex h-16 items-center px-6 border-b border-black bg-white">
        <Sparkles className="h-6 w-6 text-black mr-3" />
        <span className="text-xl font-black text-black tracking-tighter">NexusML</span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3">
        <nav className="space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center px-3 py-3 text-sm font-bold text-black rounded hover:bg-[#82F5A0] hover:text-black transition-colors"
            >
              <item.icon className="mr-3 h-5 w-5 text-black" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom Settings & Logout */}
      <div className="border-t border-black bg-[#FAFF00] flex flex-col">
        <Link
          href="/settings"
          className="group flex items-center px-7 py-4 text-sm font-bold text-black hover:bg-black hover:text-[#FAFF00] transition-colors border-b border-black"
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="group flex items-center px-7 py-4 text-sm font-bold text-black hover:bg-black hover:text-white transition-colors text-left"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Log Out
        </button>
      </div>
    </div>
  );
}
