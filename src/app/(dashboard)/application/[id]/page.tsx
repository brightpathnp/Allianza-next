import type { Metadata } from "next";

import ApplicationView from "@/pages/ApplicationView";

export const metadata: Metadata = {
  title: "Applications | Allianza",
  description: "Access your Allianza workspace and activity overview.",
  openGraph: {
    title: "Applications | Allianza",
    description: "Access your Allianza workspace and activity overview.",
  },
};

export default function DashboardPage(): React.ReactElement {
  return <ApplicationView />;
}
