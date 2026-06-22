import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <Suspense fallback={<div className="h-14 border-b border-border" />}>
        <AppNav />
      </Suspense>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
