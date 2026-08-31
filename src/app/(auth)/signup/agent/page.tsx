import type { Metadata } from 'next';

import AgentSignUp from '@/pages/AgentSignUp';

export const metadata: Metadata = {
  title: 'Agent Registration | Allianza',
  description: 'Register your education agency with Allianza.',
  openGraph: {
    title: 'Agent Registration | Allianza',
    description: 'Register your education agency with Allianza.',
  },
};

export default function AgentSignUpPage(): React.ReactElement {
  return <AgentSignUp />;
}