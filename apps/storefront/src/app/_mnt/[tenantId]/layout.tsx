import { ReactNode } from "react";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tenant-layout min-h-screen bg-white">
      {/* This layout applies to all tenant pages */}
      {children}
    </div>
  );
}
