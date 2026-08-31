"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DashboardStateProvider } from "@/contexts/DashboardStateContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <DashboardStateProvider>
          <Toaster position="top-center" richColors />
          {children}
        </DashboardStateProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}