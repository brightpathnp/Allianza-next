'use client';

import AgentOverview from '@/components/dashboard/AgentOverview';
import type { AgentDashboardData } from '@/components/dashboard/mockAgentDashboardData';
import { mockAgentDashboardData } from '@/components/dashboard/mockAgentDashboardData';

export default function AgentDashboardClient(): React.ReactElement {
  const handleMetricClick = (type: string, value: string): void => {
    console.info('Dashboard metric clicked:', { type, value });
  };

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <AgentOverview
          agentId="demo-agent"
          agencyName={mockAgentDashboardData.companyName}
          dashboardData={mockAgentDashboardData}
          institutions={[
            {
              id: 'malta-institute',
              name: 'Mediterranean Institute of Malta',
              country: 'Malta',
            },
            {
              id: 'uk-university',
              name: 'London Business University',
              country: 'UK',
            },
            {
              id: 'georgia-university',
              name: 'Tbilisi Global University',
              country: 'Georgia',
            },
          ]}
          preferredDestinations={['Malta', 'UK', 'Georgia']}
          hideSupportCenter={false}
          hasSubmittedApps
          onMetricClick={handleMetricClick}
        />
      </div>
    </main>
  );
}