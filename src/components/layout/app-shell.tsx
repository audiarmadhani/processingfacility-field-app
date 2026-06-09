"use client";

import { useSession } from "next-auth/react";
import { BottomNav } from "@/components/layout/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-stone-50">
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
      <BottomNav role={session?.user?.role} />
    </div>
  );
}
