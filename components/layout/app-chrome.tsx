"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-nexa-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[264px]">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
