import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/"); // Send back to public landing page
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    redirect("/");
  }

  // Fetch the latest user state to check email verification
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { isEmailVerified: true, email: true },
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white selection:bg-[#82F5A0] selection:text-black">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {user && !user.isEmailVerified && (
          <EmailVerificationBanner email={user.email} />
        )}
        <Header userEmail={payload.email} />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
