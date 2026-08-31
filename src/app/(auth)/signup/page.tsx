import type { Metadata } from 'next';

import SignUp from '@/pages/SignUp';

export const metadata: Metadata = {
  title: 'Sign Up | Allianza',
  description: 'Create your Allianza account.',
  openGraph: {
    title: 'Sign Up | Allianza',
    description: 'Create your Allianza account.',
  },
};

export default function SignUpPage(): React.ReactElement {
  return <SignUp />;
}