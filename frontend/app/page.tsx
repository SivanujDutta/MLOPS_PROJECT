import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-[#82F5A0] selection:text-black">
      
      {/* Top Navbar */}
      <nav className="flex items-center justify-between px-10 py-6 border-b-[4px] border-black bg-white">
        <div className="flex items-center">
          <Sparkles className="h-8 w-8 text-black mr-3" />
          <span className="text-3xl font-black tracking-tighter uppercase">NexusML</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/login" className="text-lg font-black uppercase tracking-widest hover:underline hover:text-[#0070F2]">
            Log In
          </Link>
          <Link href="/register" className="border-[3px] border-black bg-[#FAFF00] px-6 py-3 text-lg font-black uppercase tracking-widest hover:bg-[#e0e600] transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-10 py-32 flex flex-col items-center text-center">
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-[0.9] mb-8">
          Enterprise <br/>
          <span className="text-[#82F5A0] text-stroke">AI Engine</span>
        </h1>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link href="/register" className="border-[4px] border-black bg-[#82F5A0] px-12 py-6 text-2xl font-black uppercase tracking-widest shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all">
            Start Building
          </Link>
          <Link href="/login" className="border-[4px] border-black bg-white px-12 py-6 text-2xl font-black uppercase tracking-widest shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all">
            Dashboard
          </Link>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .text-stroke {
          -webkit-text-stroke: 3px black;
          color: #82F5A0;
        }
      `}} />
    </div>
  );
}
