import type { Metadata } from 'next';

import PendingApproval from '@/pages/PendingApproval';

export const metadata: Metadata = {
  title: 'Pending Approval | Allianza',
  description: 'Your Allianza registration is currently under review.',
  openGraph: {
    title: 'Pending Approval | Allianza',
    description: 'Your Allianza registration is currently under review.',
  },
};

export default function PendingApprovalPage(): React.ReactElement {
  return <PendingApproval />;
}