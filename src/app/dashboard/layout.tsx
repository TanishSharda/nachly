"use client";

import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-screen h-screen overflow-hidden bg-obsidian text-[#E7E5E5]">
      {/* Atmospheric Depth */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_2%_2%,rgba(211,196,184,0.03),transparent_40%)]" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-[260px] p-8 h-screen overflow-y-auto overflow-x-hidden scroll-smooth dash-scroll">
        {children}
      </main>
    </div>
  );
}
