import type { Metadata } from "next";

import DashboardPageClient from "@/pages/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard | Allianza",
  description: "Access your Allianza workspace and activity overview.",
  openGraph: {
    title: "Dashboard | Allianza",
    description: "Access your Allianza workspace and activity overview.",
  },
};

export default function DashboardPage(): React.ReactElement {
  return <DashboardPageClient />;
}