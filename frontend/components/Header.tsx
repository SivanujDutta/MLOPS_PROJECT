"use client";

import { Search, Bell, UserCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  message: string;
  status: string;
  timestamp: string;
};

export default function Header({ userEmail }: { userEmail?: string }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    // Poll for notifications every 10 seconds
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          
          // Simple unread logic based on local storage
          const lastViewed = localStorage.getItem("lastViewedNotifications");
          if (data.length > 0) {
            const latestNotifTime = new Date(data[0].timestamp).getTime();
            if (!lastViewed || latestNotifTime > parseInt(lastViewed)) {
              setHasUnread(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch notifications");
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      router.push(`/datasets?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && notifications.length > 0) {
      setHasUnread(false);
      localStorage.setItem("lastViewedNotifications", Date.now().toString());
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-black bg-white px-6 relative">
      {/* Breadcrumbs Placeholder */}
      <div className="flex items-center text-sm font-bold text-black tracking-tight">
        <span className="hover:underline cursor-pointer">Projects</span>
        <span className="mx-2">/</span>
        <span className="bg-black text-white px-2 py-0.5">Dashboard</span>
      </div>

      {/* Right Side: Search and Profile */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search AI Catalog..."
            className="h-9 w-64 rounded-none border border-black pl-10 pr-4 text-sm font-bold text-black placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#82F5A0] transition-all"
          />
        </div>
        
        <div className="relative">
          <button 
            onClick={toggleNotifications}
            className={`relative text-black p-1 rounded-sm transition-colors border-2 ${showNotifications ? 'bg-black text-[#FAFF00] border-black' : 'hover:bg-[#FAFF00] border-transparent'}`}
          >
            <Bell className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-[#82F5A0] border-2 border-black animate-pulse"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50">
              <div className="bg-black text-white px-4 py-2 flex justify-between items-center">
                <span className="font-black uppercase tracking-wider text-sm">Notifications</span>
                <button onClick={() => router.refresh()} className="text-xs text-[#82F5A0] font-bold hover:underline">
                  Refresh App
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto divide-y-2 divide-black">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm font-bold opacity-50">No recent notifications</div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start">
                        {notif.status === 'COMPLETED' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h4 className="text-sm font-black text-black leading-tight">{notif.title}</h4>
                          <p className="text-xs font-medium text-black mt-1">{notif.message}</p>
                          <span className="text-[10px] font-bold text-gray-500 mt-2 block uppercase">
                            {new Date(notif.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <button className="flex items-center text-black hover:bg-[#82F5A0] p-1 px-3 rounded-sm transition-colors border-2 border-transparent hover:border-black">
          <UserCircle className="h-6 w-6 mr-2" />
          <span className="text-sm font-bold truncate max-w-[150px]">{userEmail || "Account"}</span>
        </button>
      </div>
    </header>
  );
}
