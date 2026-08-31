"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import { ReactNode } from "react";

export function AuthProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      {children}
    </AuthProvider>
  );
}